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

export const verifyEmailAction = createAuthenticatedAction(
  "verifyEmail",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("user", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Verify the email address
     */
    await prisma.$transaction([
      prisma.emailConfirmationToken.deleteMany({
        where: {
          userId: data.userId,
        },
      }),

      prisma.user.update({
        where: {
          id: data.userId,
        },
        data: {
          emailVerified: new Date(),
        },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.EMAIL_VERIFIED,
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
