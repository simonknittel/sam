"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  userId: z.cuid(),
});

export const unbanUserAction = createAuthenticatedAction(
  "unbanUser",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("user", "ban")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const user = await prisma.user.findUnique({
      where: {
        id: data.userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      /** A different user deleted the user before, and the page must show it */
      return rejectConflict(t("Common.notFound"), formData);
    }

    /** Only one of two parallel unbans finds the user banned */
    const { count } = await prisma.user.updateMany({
      where: {
        id: data.userId,
        bannedAt: { not: null },
      },
      data: {
        bannedAt: null,
        bannedById: null,
        bannedReason: null,
      },
    });

    /**
     * Also when a different user unbanned the user before: the page then
     * shows that the user is not banned
     */
    refresh();

    if (count === 0)
      return {
        error: "Dieser Benutzer ist nicht gesperrt.",
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.USER_UNBANNED,
        data: {
          userId: data.userId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
