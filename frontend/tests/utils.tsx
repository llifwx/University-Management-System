import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { vi } from "vitest";

import { SessionProvider, User } from "@/entities/user";

export const STUDENT_USER: User = { id: 1, email: "s@example.edu", role: "STUDENT", is_active: true };

export function renderWithClient(ui: ReactElement, user: User = STUDENT_USER) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const result = render(
    <QueryClientProvider client={client}>
      <SessionProvider user={user}>{ui}</SessionProvider>
    </QueryClientProvider>,
  );
  return { ...result, client, invalidate };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const apiError = (status: number, code: string, message = "Backend message.") => json({ error: { code, message } }, status);

/** Stubs fetch by "METHOD /path" (query ignored). Lists are wrapped into the backend's page envelope. */
export function stubApi(routes: Record<string, unknown | (() => Response)>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://app.test");
    const route = routes[`${init?.method ?? "GET"} ${url.pathname}`];
    if (route === undefined) return apiError(404, "NOT_MOCKED", `${url.pathname} not mocked`);
    if (typeof route === "function") return (route as () => Response)();
    return Array.isArray(route) ? json({ items: route, total: route.length, offset: 0, limit: 100 }) : json(route);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** jsdom cannot navigate, so location is replaced to observe hard redirects. */
export function stubLocation(pathname = "/") {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign, pathname, search: "" });
  return assign;
}
