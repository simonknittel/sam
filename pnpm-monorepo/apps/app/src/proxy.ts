import {
  REDIRECT_TO_SEARCH_PARAM,
  REQUEST_PATH_HEADER,
} from "@/modules/auth/utils/redirectTo";
import { SESSION_TOKEN_COOKIE_NAMES } from "@/modules/auth/utils/sessionTokenCookie";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestPath = pathname + request.nextUrl.search;
  const hasSessionCookie = SESSION_TOKEN_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  /**
   * Only an early return: `requireAuthenticationPage()` verifies the session
   */
  if (pathname.startsWith("/app") && !hasSessionCookie) {
    const loginUrl = new URL(`/`, request.url);
    loginUrl.searchParams.set(REDIRECT_TO_SEARCH_PARAM, requestPath);
    return NextResponse.redirect(loginUrl);
  }

  // A session cookie that is no longer valid passes the check above. Then
  // `requireAuthenticationPage()` uses this header for the `redirect-to`
  // search param.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, requestPath);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Only /app is gated, so the proxy is limited to it. On Vercel, every request
 * passing through the proxy counts toward Fast Origin Transfer a second time,
 * so running it on routes it never acts on only adds cost.
 */
export const config = {
  matcher: ["/app/:path*"],
};
