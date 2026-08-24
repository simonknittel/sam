"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
        bannedAt: true,
      },
    });

    if (!user)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    if (!user.bannedAt)
      return {
        error: "Dieser Benutzer ist nicht gesperrt.",
        requestPayload: formData,
      };

    await prisma.user.update({
      where: {
        id: data.userId,
      },
      data: {
        bannedAt: null,
        bannedById: null,
        bannedReason: null,
      },
    });

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
     * Revalidate cache(s)
     */
    revalidatePath("/app/iam/users");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
