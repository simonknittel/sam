"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentSessionId } from "../queries/getCurrentSessionId";

const schema = z.object({
  id: z.cuid(),
});

export const deleteSession = createAuthenticatedAction(
  "deleteSession",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Deleting the session behind this very request would log the user out
     * mid-page, so signing out stays the job of the logout button.
     */
    if (data.id === (await getCurrentSessionId()))
      return {
        error: "Die aktuelle Sitzung kann nicht gelöscht werden.",
        requestPayload: formData,
      };

    /**
     * Scoping the delete to the signed-in user turns a foreign session id
     * into a no-op instead of letting anyone probe or revoke other people's
     * sessions.
     */
    const { count } = await prisma.session.deleteMany({
      where: {
        id: data.id,
        userId: authentication.session.user.id,
      },
    });
    if (count === 0)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.USER_SESSION_DELETED,
        data: {
          sessionId: data.id,
          userId: authentication.session.user.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/account/sessions");

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
