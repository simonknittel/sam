import "server-only";

import { env } from "@/env";

/**
 * The options of a cookie which a server action sets. Only the server reads
 * these cookies, thus scripts in the browser cannot read them (`httpOnly`).
 * The `secure` flag follows the same rule as the session cookie of NextAuth,
 * because the local stacks run on HTTP.
 */
export const getServerCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: new URL(env.NEXTAUTH_URL).protocol === "https:",
  maxAge,
});
