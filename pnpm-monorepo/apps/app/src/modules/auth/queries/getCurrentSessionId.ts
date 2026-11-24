import { getApplicationContext } from "@/modules/application";
import { SESSION_TOKEN_COOKIE_NAMES } from "@/modules/auth/utils/sessionTokenCookie";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findSessionIdByToken,
  findSessionIdByTokenInputSchema,
} from "@sam-monorepo/application";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Everything downstream uses the id: the session token must never be rendered
 * or compared against.
 */
export const getCurrentSessionId = cache(
  withTrace("getCurrentSessionId", async () => {
    const cookieStore = await cookies();

    const sessionToken = SESSION_TOKEN_COOKIE_NAMES.map(
      (name) => cookieStore.get(name)?.value,
    ).find(Boolean);
    if (!sessionToken) return null;

    // A cookie that no session token can match is no session
    const input = findSessionIdByTokenInputSchema.safeParse({
      session_token: sessionToken,
    });
    if (!input.success) return null;

    return findSessionIdByToken(getApplicationContext(), input.data);
  }),
);
