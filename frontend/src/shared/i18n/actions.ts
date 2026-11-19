"use server";

import { cookies } from "next/headers";

import { Locale, localeCookieName } from "./config";

export async function setLocale(locale: Locale): Promise<void> {
  const jar = await cookies();
  jar.set(localeCookieName, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
