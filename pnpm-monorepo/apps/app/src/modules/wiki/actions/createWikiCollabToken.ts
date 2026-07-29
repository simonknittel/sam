"use server";

import { env } from "@/env";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { SignJWT } from "jose";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";

const schema = z.object({
  id: z.cuid2(),
});

/**
 * Mints a short-lived JWT for connecting to the wiki collab server
 * (apps/collab). Called by the collab provider on every (re)connect. The
 * collab server seeds pages that never saw a collab session itself (content
 * JSON → ydoc).
 */
export const createWikiCollabToken = async (formData: FormData) => {
  try {
    const authentication = await requireAuthenticationAction(
      "createWikiCollabToken",
    );

    if (!env.COLLAB_JWT_SECRET) return { error: "Nicht konfiguriert." };

    const result = schema.safeParse({ id: formData.get("id") });
    if (!result.success) return { error: "Ungültige Anfrage." };

    const context = await getWikiContext();
    if (!context) return { error: "Keine Berechtigung." };

    const page = context.pagesById.get(result.data.id);
    if (!page || page.deletedAt) return { error: "Ungültige Anfrage." };
    const permissions = context.permissions.get(page.id);
    if (!permissions?.canRead) return { error: "Keine Berechtigung." };

    const token = await new SignJWT({
      pageId: page.id,
      entityId: authentication.session.entity?.id ?? null,
      canEdit: permissions.canEdit,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(authentication.session.user.id)
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(new TextEncoder().encode(env.COLLAB_JWT_SECRET));

    return { token };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return { error: "Ein unbekannter Fehler ist aufgetreten." };
  }
};
