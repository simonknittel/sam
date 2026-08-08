"use server";

import { env } from "@/env";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import type { WikiCollabSessionTokenPayload } from "@sam-monorepo/wiki-editor";
import { SignJWT } from "jose";
import { z } from "zod";
import { getWikiPageScopedContext } from "../queries/getWikiPageScopedContext";

const schema = z.object({
  id: z.cuid2(),
});

/**
 * Mints a short-lived JWT for connecting to the wiki collab server
 * (apps/collab). Called by the collab provider on every (re)connect. The
 * collab server seeds pages that never saw a collab session itself (content
 * JSON → ydoc). Serves both the global wiki and event pages — the event
 * resolver already withdraws canEdit once the event is over, so frozen
 * pages get read-only tokens.
 */
export const createWikiCollabToken = createAuthenticatedAction<
  typeof schema,
  { token: string }
>(
  "createWikiCollabToken",
  schema,
  async (formData, authentication, data, t) => {
    if (!env.COLLAB_JWT_SECRET)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const page = scoped.context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const permissions = scoped.context.permissions.get(page.id);
    if (!permissions?.canRead)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const claims = {
      scope: "session",
      pageId: page.id,
      entityId: authentication.session.entity?.id ?? null,
      canEdit: permissions.canEdit,
    } satisfies Omit<WikiCollabSessionTokenPayload, "sub">;

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(authentication.session.user.id)
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(new TextEncoder().encode(env.COLLAB_JWT_SECRET));

    return { token };
  },
);
