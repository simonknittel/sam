"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { UserRole } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  userId: z.cuid(),
  reason: z.string().trim().max(500).optional(),
});

export const banUserAction = createAuthenticatedAction(
  "banUser",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("user", "ban")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    if (data.userId === authentication.session.user.id)
      return {
        error: "Du kannst dich nicht selbst sperren.",
        requestPayload: formData,
      };

    const user = await prisma.user.findUnique({
      where: {
        id: data.userId,
      },
    });

    if (!user)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    // Admins bypass the permission checks and could unban themselves anyway
    if (user.role === UserRole.ADMIN)
      return {
        error: "Administratoren können nicht gesperrt werden.",
        requestPayload: formData,
      };

    if (user.bannedAt)
      return {
        error: "Dieser Benutzer ist bereits gesperrt.",
        requestPayload: formData,
      };

    const reason = data.reason || null;

    /**
     * Ban the user and revoke their active sessions
     */
    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: data.userId,
        },
        data: {
          bannedAt: new Date(),
          bannedById: authentication.session.entity.id,
          bannedReason: reason,
        },
      }),

      prisma.session.deleteMany({
        where: {
          userId: data.userId,
        },
      }),
    ]);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.USER_BANNED,
        data: {
          userId: data.userId,
          ...(reason ? { reason } : {}),
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
