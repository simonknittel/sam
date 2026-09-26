"use server";

import { prisma } from "@/db";
import { env } from "@/env";
import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { createSession, SESSION_MAX_AGE } from "@/modules/auth/server/auth";
import { validateRedirectTo } from "@/modules/auth/utils/redirectTo";
import { DEVELOPMENT_SESSION_TOKEN_COOKIE } from "@/modules/auth/utils/sessionTokenCookie";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import * as z from "zod";
import { DEVELOPMENT_LOGIN_USER_WHERE } from "../queries/getDevelopmentLoginUsers";

/** 256 bits, the same as the fallback token generator of NextAuth */
const SESSION_TOKEN_BYTES = 32;

/** A real deep link is much shorter; the limit only bounds the input */
const MAX_REDIRECT_TO_LENGTH = 2048;

const schema = z.object({
  userId: z.cuid(),
  redirectTo: z.string().max(MAX_REDIRECT_TO_LENGTH).optional(),
});

/**
 * Signs in as an admin without Discord. Thus a person or an AI agent can log
 * in on the dev server of each git worktree. The action cannot use
 * `createAuthenticatedAction`, because the visitor has no session yet.
 * Instead, it refuses to run outside of development, also if a production
 * build contains it.
 */
export const developmentLogin = withTrace(
  "developmentLogin",
  async (formData: FormData): Promise<ActionResponse> => {
    const t = await getTranslations();

    if (env.NODE_ENV !== "development" || !DEVELOPMENT_SESSION_TOKEN_COOKIE)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const result = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    const user = await prisma.user.findFirst({
      where: {
        ...DEVELOPMENT_LOGIN_USER_WHERE,
        id: result.data.userId,
      },
      select: {
        id: true,
      },
    });
    if (!user)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const sessionToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
    const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await createSession({ sessionToken, userId: user.id, expires });

    (await cookies()).set(DEVELOPMENT_SESSION_TOKEN_COOKIE.name, sessionToken, {
      ...DEVELOPMENT_SESSION_TOKEN_COOKIE.options,
      expires,
    });

    redirect(
      validateRedirectTo(result.data.redirectTo ?? null) ?? "/app/dashboard",
    );
  },
);
