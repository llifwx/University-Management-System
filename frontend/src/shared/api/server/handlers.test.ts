// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleLogin, handleLogout, handleProxy, handleRefreshRedirect } from "./handlers";

const ORIGIN = "http://app.test";
const API = "http://localhost:8000/api/v1";

const jwt = (exp = Math.floor(Date.now() / 1000) + 3600) => `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
const pair = () => ({ access_token: "new-access", refresh_token: jwt(), token_type: "bearer", expires_in: 900 });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const unauthorized = () => json({ error: { code: "INVALID_TOKEN", message: "Invalid" } }, 401);

let tokenCounter = 0;
/** Refresh results are cached per token, so tests must not share one. */
const uniqueRefresh = () => `refresh-${++tokenCounter}`;

function request(path: string, { method = "GET", cookies = {}, body, headers = {} }: { method?: string; cookies?: Record<string, string>; body?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    body,
    headers: {
      host: "app.test",
      ...(method === "GET" ? {} : { origin: ORIGIN }),
      ...(body ? { "content-type": "application/json" } : {}),
      cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; "),
      ...headers,
    },
  });
}

const proxy = (req: NextRequest, ...path: string[]) => handleProxy(req, { params: Promise.resolve({ path }) });

type Route = (init: RequestInit) => Response | Promise<Response>;
function stubBackend(routes: Record<string, Route>) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const key = `${init.method ?? "GET"} ${url.replace(API, "").split("?")[0]}`;
    if (!routes[key]) throw new Error(`Unexpected backend call: ${key}`);
    return routes[key](init);
  });
  return calls;
}

const countOf = (calls: { url: string }[], suffix: string) => calls.filter((call) => call.url.endsWith(suffix)).length;
const bearer = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;

beforeEach(() => vi.unstubAllEnvs());

describe("login", () => {
  it("stores tokens only in HttpOnly cookies and returns only the user", async () => {
    const calls = stubBackend({
      "POST /auth/login": () => json(pair()),
      "GET /auth/me": () => json({ id: 1, email: "a@b.c", role: "STUDENT", is_active: true }),
    });
    const response = await handleLogin(request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.c", password: "pw" }) }));

    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("access_token");
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=lax/i);
    }
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(String(calls[0].init.body)).toBe("username=a%40b.c&password=pw"); // OAuth2 form contract.
  });

  it("passes invalid-credential errors through and sets no cookies", async () => {
    stubBackend({ "POST /auth/login": () => json({ error: { code: "INVALID_CREDENTIALS", message: "No" } }, 401) });
    const response = await handleLogin(request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.c", password: "x" }) }));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("INVALID_CREDENTIALS");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("reports an unreachable backend as 503", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("connect failed");
    });
    const response = await handleLogin(request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.c", password: "x" }) }));
    expect(response.status).toBe(503);
  });

  it("marks cookies Secure when configured", async () => {
    vi.stubEnv("COOKIE_SECURE", "true");
    stubBackend({ "POST /auth/login": () => json(pair()), "GET /auth/me": () => json({ id: 1 }) });
    const response = await handleLogin(request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.c", password: "pw" }) }));
    expect(response.headers.getSetCookie().every((cookie) => /Secure/i.test(cookie))).toBe(true);
  });
});

describe("CSRF protection", () => {
  it("rejects cross-site state changes", async () => {
    const calls = stubBackend({});
    const crossSite = request("/api/proxy/registrations", { method: "POST", body: "{}", cookies: { ums_access: "a" }, headers: { "sec-fetch-site": "cross-site" } });
    expect((await proxy(crossSite, "registrations")).status).toBe(403);
    const foreignOrigin = request("/api/proxy/registrations", { method: "POST", body: "{}", cookies: { ums_access: "a" }, headers: { origin: "https://evil.example" } });
    expect((await proxy(foreignOrigin, "registrations")).status).toBe(403);
    expect(calls).toEqual([]);
  });

  it("also covers login and logout", async () => {
    stubBackend({});
    const headers = { "sec-fetch-site": "cross-site" };
    expect((await handleLogin(request("/api/auth/login", { method: "POST", body: "{}", headers }))).status).toBe(403);
    expect((await handleLogout(request("/api/auth/logout", { method: "POST", headers }))).status).toBe(403);
  });
});

describe("proxy", () => {
  it("attaches the bearer token and forwards query and body", async () => {
    const calls = stubBackend({ "POST /registrations": () => json({ registration_id: 1 }, 201) });
    const response = await proxy(request("/api/proxy/registrations?x=1", { method: "POST", cookies: { ums_access: "tok" }, body: '{"section_id":1}' }), "registrations");
    expect(response.status).toBe(201);
    expect(calls[0].url).toBe(`${API}/registrations?x=1`);
    expect(bearer(calls[0].init)).toBe("Bearer tok");
    expect(Buffer.from(calls[0].init.body as ArrayBuffer).toString()).toBe('{"section_id":1}');
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps token-issuing routes unreachable", async () => {
    const calls = stubBackend({});
    for (const path of [["auth", "login"], ["auth", "refresh"], ["auth", "logout"], ["..", "admin"]]) {
      expect((await proxy(request("/api/proxy/x", { method: "POST", cookies: { ums_access: "a" }, body: "{}" }), ...path)).status).toBe(404);
    }
    expect(calls).toEqual([]);
  });

  it("does not sign anyone out on backend business errors", async () => {
    stubBackend({ "GET /users": () => json({ error: { code: "FORBIDDEN", message: "No" } }, 403) });
    const response = await proxy(request("/api/proxy/users", { cookies: { ums_access: "a", ums_refresh: uniqueRefresh() } }), "users");
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("refreshes on a rejected access token and replays the request, body included", async () => {
    const calls = stubBackend({
      "POST /registrations": (init) => (bearer(init) === "Bearer old" ? unauthorized() : json({ registration_id: 1 }, 201)),
      "POST /auth/refresh": () => json(pair()),
    });
    const response = await proxy(request("/api/proxy/registrations", { method: "POST", cookies: { ums_access: "old", ums_refresh: uniqueRefresh() }, body: '{"section_id":1}' }), "registrations");
    expect(response.status).toBe(201);
    expect(Buffer.from(calls[2].init.body as ArrayBuffer).toString()).toBe('{"section_id":1}');
    expect(response.headers.getSetCookie().join()).toContain("ums_access=new-access");
  });

  it("refreshes first when the access cookie has already expired", async () => {
    const calls = stubBackend({ "POST /auth/refresh": () => json(pair()), "GET /courses": () => json({ items: [] }) });
    const response = await proxy(request("/api/proxy/courses", { cookies: { ums_refresh: uniqueRefresh() } }), "courses");
    expect(response.status).toBe(200);
    expect(bearer(calls[1].init)).toBe("Bearer new-access");
  });

  it("spends a single-use refresh token once across parallel requests", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const calls = stubBackend({
      "POST /auth/refresh": async () => {
        await gate;
        return json(pair());
      },
      "GET /courses": () => json({ items: [] }),
    });
    const refresh = uniqueRefresh();
    const responses = Promise.all(Array.from({ length: 5 }, () => proxy(request("/api/proxy/courses", { cookies: { ums_refresh: refresh } }), "courses")));
    await new Promise((resolve) => setTimeout(resolve));
    release();
    for (const response of await responses) {
      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie().join()).toContain("ums_access=new-access");
    }
    expect(countOf(calls, "/auth/refresh")).toBe(1);
  });

  it("does not replay the spent token for a late request still carrying the old cookie", async () => {
    const calls = stubBackend({ "POST /auth/refresh": () => json(pair()), "GET /courses": () => json({ items: [] }) });
    const refresh = uniqueRefresh();
    await proxy(request("/api/proxy/courses", { cookies: { ums_refresh: refresh } }), "courses");
    const late = await proxy(request("/api/proxy/courses", { cookies: { ums_refresh: refresh } }), "courses");
    expect(late.status).toBe(200);
    expect(countOf(calls, "/auth/refresh")).toBe(1);
  });

  it("ends the session when the refresh token is rejected", async () => {
    stubBackend({ "GET /courses": unauthorized, "POST /auth/refresh": unauthorized });
    const response = await proxy(request("/api/proxy/courses", { cookies: { ums_access: "old", ums_refresh: uniqueRefresh() } }), "courses");
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().join()).toMatch(/ums_access=;.*ums_refresh=;/);
  });

  it("keeps the session when the refresh endpoint is merely down", async () => {
    stubBackend({ "GET /courses": unauthorized, "POST /auth/refresh": () => json({}, 503) });
    const response = await proxy(request("/api/proxy/courses", { cookies: { ums_access: "old", ums_refresh: uniqueRefresh() } }), "courses");
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("returns 401 with no cookies at all", async () => {
    const calls = stubBackend({});
    expect((await proxy(request("/api/proxy/courses"), "courses")).status).toBe(401);
    expect(calls).toEqual([]);
  });
});

describe("refresh redirect", () => {
  it("rotates and returns to a safe path", async () => {
    stubBackend({ "POST /auth/refresh": () => json(pair()) });
    const response = await handleRefreshRedirect(request("/api/auth/refresh?next=/my-courses", { cookies: { ums_refresh: uniqueRefresh() } }));
    expect(response.headers.get("location")).toBe("/my-courses");
    expect(response.headers.getSetCookie().join()).toContain("ums_access=new-access");
  });

  it("refuses an open redirect", async () => {
    stubBackend({ "POST /auth/refresh": () => json(pair()) });
    const response = await handleRefreshRedirect(request("/api/auth/refresh?next=//evil.example", { cookies: { ums_refresh: uniqueRefresh() } }));
    expect(response.headers.get("location")).toBe("/");
  });

  it("sends an invalid session to login and clears cookies", async () => {
    stubBackend({ "POST /auth/refresh": unauthorized });
    const response = await handleRefreshRedirect(request("/api/auth/refresh?next=/admin", { cookies: { ums_refresh: uniqueRefresh() } }));
    expect(response.headers.get("location")).toBe("/login?expired=1&next=%2Fadmin");
    expect(response.headers.getSetCookie().join()).toContain("ums_refresh=;");
  });

  it("keeps cookies when the backend is down", async () => {
    stubBackend({ "POST /auth/refresh": () => json({}, 503) });
    const response = await handleRefreshRedirect(request("/api/auth/refresh", { cookies: { ums_refresh: uniqueRefresh() } }));
    expect(response.headers.get("location")).toBe("/login?error=unavailable");
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});

describe("logout", () => {
  it("revokes server-side and clears cookies", async () => {
    const calls = stubBackend({ "POST /auth/logout": () => json({ message: "ok" }) });
    const response = await handleLogout(request("/api/auth/logout", { method: "POST", cookies: { ums_access: "tok", ums_refresh: uniqueRefresh() } }));
    expect(response.status).toBe(204);
    expect(bearer(calls[0].init)).toBe("Bearer tok");
    expect(response.headers.getSetCookie().join()).toMatch(/ums_access=;.*ums_refresh=;/);
  });

  it("renews an expired access token so the session is still revoked", async () => {
    const calls = stubBackend({ "POST /auth/refresh": () => json(pair()), "POST /auth/logout": () => json({ message: "ok" }) });
    await handleLogout(request("/api/auth/logout", { method: "POST", cookies: { ums_refresh: uniqueRefresh() } }));
    expect(bearer(calls[1].init)).toBe("Bearer new-access");
  });

  it("still clears cookies when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("down");
    });
    const response = await handleLogout(request("/api/auth/logout", { method: "POST", cookies: { ums_access: "tok" } }));
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie().join()).toContain("ums_access=;");
  });
});
