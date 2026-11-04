import { NextRequest, NextResponse } from "next/server";

/**
 * Optimistic routing only (reads cookies, verifies nothing). Real checks: `requireUser` in layouts, FastAPI on data.
 * An expired access cookie is renewed through a route handler because rotation must share its single-flight guard.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.has("ums_access")) return NextResponse.next();
  const next = encodeURIComponent(pathname + search);
  const target = request.cookies.has("ums_refresh") ? `/api/auth/refresh?next=${next}` : `/login?next=${next}`;
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = {
  matcher: ["/dashboard/:path*", "/courses/:path*", "/my-courses/:path*", "/schedule/:path*", "/profile/:path*", "/teacher/:path*", "/admin/:path*"],
};
