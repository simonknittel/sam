"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
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
      select: {
        role: true,
      },
    });

    if (!user) {
      /** A different user deleted the user before, and the page must show it */
      return rejectConflict(t("Common.notFound"), formData);
    }

    // Admins bypass the permission checks and could unban themselves anyway
    if (user.role === UserRole.ADMIN)
      return {
        error: "Administratoren können nicht gesperrt werden.",
        requestPayload: formData,
      };

    const reason = data.reason || null;
    const bannedById = authentication.session.entity.id;

    /**
     * Ban the user and revoke their active sessions. Only one of two
     * parallel bans finds the user not banned.
     */
    const isBanned = await prisma.$transaction(async (transaction) => {
      const { count } = await transaction.user.updateMany({
        where: {
          id: data.userId,
          bannedAt: null,
        },
        data: {
          bannedAt: new Date(),
          bannedById,
          bannedReason: reason,
        },
      });
      if (count === 0) return false;

      await transaction.session.deleteMany({
        where: {
          userId: data.userId,
        },
      });
      return true;
    });

    /**
     * Also when a different user banned the user before: the page then shows
     * the ban
     */
    refresh();

    if (!isBanned)
      return {
        error: "Dieser Benutzer ist bereits gesperrt.",
        requestPayload: formData,
      };

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
