"use client";

import { createContext, ReactNode, useContext } from "react";

import type { User } from "./types";

const SessionContext = createContext<User | null>(null);

/** Seeded by the dashboard layout from a server-verified /auth/me; for UI decisions only. */
export function SessionProvider({ user, children }: { user: User; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): User {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSessionUser must be used under the dashboard layout");
  return user;
}
