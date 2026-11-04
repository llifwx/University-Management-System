import { ApiError } from "./errors";

/** The browser only ever talks to the same-origin BFF, which attaches the session's bearer token. */
const PROXY_BASE = "/api/proxy";
const MAX_PAGE_SIZE = 100;

export type Page<T> = { items: T[]; total: number; offset: number; limit: number };
export type Query = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Query;
  json?: unknown;
  signal?: AbortSignal;
};

function redirectToLogin() {
  const { pathname, search } = window.location;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a dead session must also drop the query cache
  window.location.assign(`/login?expired=1&next=${encodeURIComponent(pathname + search)}`);
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  return new ApiError(
    response.status,
    error?.code ?? "UNKNOWN_ERROR",
    error?.message ?? "The request failed. Please try again.",
    error?.details ?? [],
  );
}

export async function apiRequest<T>(path: string, { method = "GET", query, json, signal }: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const search = params.size ? `?${params}` : "";
  const response = await fetch(`${PROXY_BASE}${path}${search}`, {
    method,
    signal,
    headers: json === undefined ? undefined : { "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (!response.ok) {
    const error = await parseApiError(response);
    // The BFF has already tried a refresh, so a 401 here means the session is really over.
    if (response.status === 401) redirectToLogin();
    throw error;
  }
  return (await response.json()) as T;
}

/**
 * The backend has no search, status or student filters, so filtering those happens over complete lists.
 * ponytail: loads whole collections; add server-side filters to FastAPI if they outgrow a few thousand rows.
 */
export async function fetchAllPages<T>(path: string, { query, signal }: { query?: Query; signal?: AbortSignal } = {}): Promise<T[]> {
  const items: T[] = [];
  let total = Infinity;
  while (items.length < total) {
    const page = await apiRequest<Page<T>>(path, {
      query: { ...query, offset: items.length, limit: MAX_PAGE_SIZE },
      signal,
    });
    if (page.items.length === 0) break;
    items.push(...page.items);
    total = page.total;
  }
  return items;
}

/** Cheap row count for dashboards: the backend reports `total` on every page. */
export async function fetchTotal(path: string, signal?: AbortSignal): Promise<number> {
  return (await apiRequest<Page<unknown>>(path, { query: { limit: 1 }, signal })).total;
}
