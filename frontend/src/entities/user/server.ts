import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ACCESS_COOKIE, REFRESH_COOKIE, apiUrl } from "@/shared/api/server";

import type { User } from "./model/types";

export type ServerSession = { user: User; canRefresh: false } | { user: null; canRefresh: boolean };

/** One /auth/me per render. A network failure throws to the nearest error.tsx rather than signing out. */
export const getServerSession = cache(async (): Promise<ServerSession> => {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const canRefresh = jar.has(REFRESH_COOKIE);
  if (!access) return { user: null, canRefresh };
  const response = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
  if (response.status === 401) return { user: null, canRefresh };
  if (!response.ok) throw new Error(`Session check failed with ${response.status}`);
  return { user: (await response.json()) as User, canRefresh: false };
});

export async function requireUser(): Promise<User> {
  const session = await getServerSession();
  if (session.user) return session.user;
  // Lost the race with an expiring cookie (or the token was rejected): the refresh route settles it.
  redirect(session.canRefresh ? "/api/auth/refresh?next=/" : "/login");
}
