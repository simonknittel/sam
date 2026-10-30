import { authOptions } from "@/modules/auth/server";
import { getLoginErrorPath, LoginError } from "@/modules/auth/utils/loginError";
import { log } from "@/modules/logging";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

/**
 * Public by design: these routes are the sign-in and the sign-out. The
 * callbacks of `authOptions` refuse banned users and users who are not
 * members of the Discord guild.
 *
 * NextAuth's App Router handler is typed `any`; give it the route-handler
 * shape Next.js expects.
 */
const handler = NextAuth(authOptions) as (
  request: Request,
  context: RouteContext<"/api/auth/[...nextauth]">,
) => Promise<Response>;

/**
 * Discord sends `access_denied` to the callback when the user cancels the
 * login. next-auth gives the same error code for this as for a failure.
 */
const handleGet = async (
  request: Request,
  context: RouteContext<"/api/auth/[...nextauth]">,
) => {
  const { nextauth } = await context.params;
  const isCancelledLogin =
    nextauth.join("/") === "callback/discord" &&
    new URL(request.url).searchParams.get("error") === "access_denied";

  if (isCancelledLogin) {
    log.info("Login cancelled at Discord");
    return NextResponse.redirect(
      new URL(getLoginErrorPath(LoginError.LoginCancelled), request.url),
    );
  }

  return handler(request, context);
};

export { handleGet as GET, handler as POST };
