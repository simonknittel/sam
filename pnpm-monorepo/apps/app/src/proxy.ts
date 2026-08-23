import { REDIRECT_TO_SEARCH_PARAM } from "@/modules/auth/utils/redirectTo";
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
   *
   * The `redirect-to` search param preserves the deep link, so that the login
   * page can send the user back to it after the login.
   */
  if (pathname.startsWith("/app") && !sessionCookie) {
    const loginUrl = new URL(`/`, request.url);
    loginUrl.searchParams.set(
      REDIRECT_TO_SEARCH_PARAM,
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
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
