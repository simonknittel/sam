import "server-only";

import { env } from "@/env";

/**
 * The options of a cookie which a server action sets. The `secure` flag
 * follows the same rule as the session cookie of NextAuth, because the
 * local stacks run on HTTP.
 */
export const getServerCookieOptions = (maxAge: number) => ({
  sameSite: "lax" as const,
  secure: new URL(env.NEXTAUTH_URL).protocol === "https:",
  maxAge,
});
