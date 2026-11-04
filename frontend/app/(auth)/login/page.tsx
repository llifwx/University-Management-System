import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { roleHome } from "@/entities/user";
import { getServerSession } from "@/entities/user/server";
import { LoginPage } from "@/pages/login";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next, expired, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  const unavailable = error === "unavailable";

  const session = await getServerSession().catch(() => null);
  if (session?.user) redirect(roleHome(session.user.role));
  // Restore a session whose access cookie lapsed. Skipped on the refresh route's own failure redirects.
  if (session?.canRefresh && !unavailable && !expired) redirect(`/api/auth/refresh?next=${encodeURIComponent(nextPath ?? "/")}`);

  return <LoginPage next={nextPath} expired={expired === "1"} unavailable={unavailable} />;
}
