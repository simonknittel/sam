"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { Prisma } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  roleId: z.cuid(),
  permissionString: z
    .string()
    .trim()
    .min(1)
    .regex(/^[\w\-]+;[\w\-]+(?:;[\w\-]+=[\w\-\*]+)*$/),
  checked: z.stringbool(),
});

export const updateSingleRolePermission = createAuthenticatedAction(
  "updateSingleRolePermission",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("role", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update role. The update fails with P2025 when the role is gone.
     */
    const isUpdated = await prisma.role
      .update({
        where: {
          id: data.roleId,
        },
        data: {
          permissionStrings: data.checked
            ? {
                createMany: {
                  data: { permissionString: data.permissionString },
                  // A double click or a second admin must not create a duplicate
                  skipDuplicates: true,
                },
              }
            : {
                deleteMany: { permissionString: data.permissionString },
              },
        },
        select: { id: true },
      })
      .then(() => true)
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        )
          return false;
        throw error;
      });

    /**
     * Also for the error below: then a different user deleted the role, and
     * the page must show it.
     */
    refresh();

    if (!isUpdated)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_PERMISSION_TOGGLED,
        data: {
          roleId: data.roleId,
          permissionString: data.permissionString,
          enabled: data.checked,
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
