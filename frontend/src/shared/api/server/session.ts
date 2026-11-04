import "server-only";

import { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "ums_access";
export const REFRESH_COOKIE = "ums_refresh";

export type TokenPair = { access_token: string; refresh_token: string; expires_in: number };
export type RefreshResult = { status: "ok"; tokens: TokenPair } | { status: "invalid" } | { status: "unavailable" };

export function apiUrl(path: string): string {
  return `${process.env.API_INTERNAL_URL ?? "http://localhost:8000/api/v1"}${path}`;
}

function secureCookies(): boolean {
  return process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";
}

/** The JWT is only read to size the cookie; FastAPI remains the party that verifies it. */
function secondsUntilExpiry(jwt: string): number | undefined {
  try {
    const { exp } = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    return undefined;
  }
}

export function setSessionCookies(response: NextResponse, tokens: TokenPair) {
  const options = { httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/" } as const;
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...options, maxAge: tokens.expires_in });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...options, maxAge: secondsUntilExpiry(tokens.refresh_token) });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

/** Cookie auth needs CSRF protection on state changes, on top of SameSite=Lax. */
export function isSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const REPLAY_GRACE_MS = 30_000;
type Flight = { result: Promise<RefreshResult>; settledAt?: number };

/**
 * FastAPI refresh tokens are single-use and a replay revokes the whole session, so parallel browser
 * requests (or one still carrying the old cookie) must share one rotation rather than each spending the token.
 * globalThis because Next.js may instantiate this module once per route bundle.
 * ponytail: per-process; multiple Next.js instances need a shared store such as Redis keyed the same way.
 */
const flights: Map<string, Flight> = ((globalThis as { __umsRefreshFlights?: Map<string, Flight> }).__umsRefreshFlights ??= new Map());

async function requestRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (response.ok) return { status: "ok", tokens: (await response.json()) as TokenPair };
    // Only a definite rejection may end the session; a 5xx must not sign the user out.
    return { status: response.status === 401 || response.status === 422 ? "invalid" : "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function refreshSession(refreshToken: string): Promise<RefreshResult> {
  const now = Date.now();
  for (const [token, flight] of flights) {
    if (flight.settledAt && now - flight.settledAt > REPLAY_GRACE_MS) flights.delete(token);
  }
  const existing = flights.get(refreshToken);
  if (existing) return existing.result;

  const flight: Flight = {
    result: requestRefresh(refreshToken).then((result) => {
      // Failures are not replayable answers: "unavailable" should retry, and "invalid" stays invalid upstream.
      if (result.status === "ok") flight.settledAt = Date.now();
      else flights.delete(refreshToken);
      return result;
    }),
  };
  flights.set(refreshToken, flight);
  return flight.result;
}
