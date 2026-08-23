import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie =
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  /**
   * This is only an early return. Actual verification of the session is done
   * on the individual pages. Use `authenticatePage()` in order to fully
   * authenticate the user.
   */
  if (pathname.startsWith("/app") && !sessionCookie) {
    return NextResponse.redirect(new URL(`/`, request.url));
  }

  return NextResponse.next();
}

/**
 * Only /app is gated, so the proxy is limited to it. On Vercel, every request
 * passing through the proxy counts toward Fast Origin Transfer a second time,
 * so running it on routes it never acts on only adds cost.
 */
export const config = {
  matcher: ["/app/:path*"],
};
