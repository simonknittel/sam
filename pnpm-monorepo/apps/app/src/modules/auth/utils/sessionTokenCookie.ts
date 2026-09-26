import { env } from "@/env";

/**
 * Browsers scope cookies by host and ignore the port. Locally, each git
 * worktree runs its own dev server on its own port with its own database.
 * With one shared cookie, a login on one port would log the user out on all
 * other ports. Thus in development, the name contains the port of the dev
 * server. The options are the defaults of NextAuth on http.
 *
 * NextAuth joins all cookies whose name starts with the name of the session
 * cookie, because it splits large sessions into chunks. Thus the name must
 * not start with the default name `next-auth.session-token`, and the name of
 * one port must not start with the name of a different port.
 */
export const DEVELOPMENT_SESSION_TOKEN_COOKIE =
  env.NODE_ENV === "development"
    ? {
        name: `sam-dev-${new URL(env.NEXTAUTH_URL).port}.session-token`,
        options: {
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          secure: false,
        },
      }
    : null;

/**
 * Outside of development, NextAuth uses its default name. It prefixes the
 * name with `__Secure-` as soon as it runs on https, so both spellings have
 * to be looked at.
 */
export const SESSION_TOKEN_COOKIE_NAMES = DEVELOPMENT_SESSION_TOKEN_COOKIE
  ? [DEVELOPMENT_SESSION_TOKEN_COOKIE.name]
  : ["__Secure-next-auth.session-token", "next-auth.session-token"];
