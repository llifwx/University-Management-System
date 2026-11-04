import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { safeRedirectPath } from "@/shared/lib/safe-redirect";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  TokenPair,
  apiUrl,
  clearSessionCookies,
  isSameOriginRequest,
  refreshSession,
  setSessionCookies,
} from "./session";

const NO_STORE = { "Cache-Control": "private, no-store" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: NO_STORE });
}

const forbiddenOrigin = () => errorResponse(403, "CSRF_REJECTED", "Cross-site request rejected.");
const backendDown = () => errorResponse(503, "BACKEND_UNAVAILABLE", "The university service is unavailable. Please try again shortly.");

/** Relative Location: request.url can carry the container's bind address behind Docker. */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path, ...NO_STORE } });
}

export async function handleLogin(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();
  const credentials = await request.json().catch(() => null);
  if (typeof credentials?.email !== "string" || typeof credentials?.password !== "string") {
    return errorResponse(422, "VALIDATION_ERROR", "Email and password are required.");
  }
  try {
    const login = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: credentials.email, password: credentials.password }),
      cache: "no-store",
    });
    if (!login.ok) {
      return new NextResponse(await login.text(), { status: login.status, headers: { "Content-Type": "application/json", ...NO_STORE } });
    }
    const tokens = (await login.json()) as TokenPair;
    const me = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    if (!me.ok) return backendDown();
    // Tokens stay in HttpOnly cookies; the browser only receives the user.
    const response = NextResponse.json(await me.json(), { headers: NO_STORE });
    setSessionCookies(response, tokens);
    return response;
  } catch {
    return backendDown();
  }
}

export async function handleLogout(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && refresh) {
    // Revocation needs a live access token, so an expired one must be renewed first.
    const result = await refreshSession(refresh);
    if (result.status === "ok") access = result.tokens.access_token;
  }
  if (access) {
    await fetch(apiUrl("/auth/logout"), { method: "POST", headers: { Authorization: `Bearer ${access}` }, cache: "no-store" }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204, headers: NO_STORE });
  clearSessionCookies(response);
  return response;
}

/** Full-page counterpart of the proxy's refresh: Server Components cannot set cookies, so they redirect here. */
export async function handleRefreshRedirect(request: NextRequest): Promise<NextResponse> {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const result = refresh ? await refreshSession(refresh) : ({ status: "invalid" } as const);
  if (result.status === "unavailable") return redirectTo("/login?error=unavailable");
  if (result.status === "invalid") {
    const response = redirectTo(`/login?expired=1&next=${encodeURIComponent(next)}`);
    clearSessionCookies(response);
    return response;
  }
  const response = redirectTo(next);
  setSessionCookies(response, result.tokens);
  return response;
}

const SAFE_SEGMENT = /^[\w-]+$/;

/** Token-issuing routes have dedicated handlers; through here they would hand raw tokens to the browser. */
function isProxyable(path: string[]): boolean {
  if (!path.every((segment) => SAFE_SEGMENT.test(segment))) return false;
  return path[0] !== "auth" || (path.length === 2 && path[1] === "me");
}

export async function handleProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const { path } = await context.params;
  const unsafe = request.method !== "GET" && request.method !== "HEAD";
  if (unsafe && !isSameOriginRequest(request)) return forbiddenOrigin();
  if (!isProxyable(path)) return errorResponse(404, "NOT_FOUND", "Not found.");

  const url = `${apiUrl(`/${path.join("/")}`)}${request.nextUrl.search}`;
  const body = unsafe ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");
  const send = (token: string) =>
    fetch(url, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, ...(contentType ? { "Content-Type": contentType } : {}) },
      body: body?.byteLength ? body : undefined,
      cache: "no-store",
      signal: request.signal,
    });

  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  let rotated: TokenPair | undefined;
  let sessionEnded = false;

  const renew = async () => {
    const result = refreshCookie ? await refreshSession(refreshCookie) : ({ status: "invalid" } as const);
    if (result.status === "invalid") sessionEnded = true;
    if (result.status !== "ok") return false;
    rotated = result.tokens;
    access = result.tokens.access_token;
    return true;
  };

  const finish = (response: NextResponse) => {
    if (sessionEnded) clearSessionCookies(response);
    else if (rotated) setSessionCookies(response, rotated);
    return response;
  };

  try {
    if (!access && !(await renew())) {
      return finish(sessionEnded ? errorResponse(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.") : backendDown());
    }
    let upstream = await send(access!);
    if (upstream.status === 401 && !rotated) {
      if (await renew()) upstream = await send(access!);
      else if (!sessionEnded) return backendDown();
    }
    if (upstream.status === 401) sessionEnded = true;
    const headers = new Headers(NO_STORE);
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) headers.set("Content-Type", upstreamType);
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) headers.set("X-Request-ID", requestId);
    return finish(new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers }));
  } catch {
    // Keep a rotated pair: its predecessor is already spent, so dropping it would end the session.
    return finish(backendDown());
  }
}
