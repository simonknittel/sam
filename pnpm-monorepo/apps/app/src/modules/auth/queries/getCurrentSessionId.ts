import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * NextAuth prefixes its cookie with `__Secure-` as soon as it runs on https,
 * so both spellings have to be looked at.
 */
const SESSION_TOKEN_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

/**
 * Resolves the session behind the current request to its id. Going through
 * the id keeps the session token itself out of everything downstream, which
 * must never be rendered or compared against.
 */
export const getCurrentSessionId = cache(
  withTrace("getCurrentSessionId", async () => {
    const cookieStore = await cookies();

    const sessionToken = SESSION_TOKEN_COOKIE_NAMES.map(
      (name) => cookieStore.get(name)?.value,
    ).find(Boolean);
    if (!sessionToken) return null;

    const session = await prisma.session.findUnique({
      where: {
        sessionToken,
      },
      select: {
        id: true,
      },
    });

    return session?.id ?? null;
  }),
);
