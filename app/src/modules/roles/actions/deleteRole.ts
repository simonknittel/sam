"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteRole = createAuthenticatedAction(
  "deleteRole",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!(await authentication.authorize("role", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update role
     */
    const roleToDelete = await prisma.role.findUnique({
      where: {
        id: data.id,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (!roleToDelete)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await prisma.$transaction([
      prisma.role.delete({
        where: {
          id: data.id,
        },
      }),

      prisma.permissionString.deleteMany({
        where: {
          permissionString: {
            contains: data.id,
          },
        },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_DELETED,
        data: {
          roleId: data.id,
          name: roleToDelete.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Redirect
     */
    redirect("/app/iam/roles");
  },
);
