"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { deletePermissionStringsReferencing } from "@/modules/roles/utils/deletePermissionStringsReferencing";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

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
    if (!roleToDelete) {
      /** A different user deleted the role, and the page must show it */
      refresh();
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    }

    await prisma.$transaction([
      prisma.role.delete({
        where: {
          id: data.id,
        },
      }),

      deletePermissionStringsReferencing("roleId", data.id),
    ]);

    refresh();

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
