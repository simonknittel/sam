"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  roleId: z.cuid(),
  permissionString: z
    .string()
    .trim()
    .min(1)
    .regex(/^[\w\-]+;[\w\-]+(?:;[\w\-]+=[\w\-\*]+)*$/),
  checked: z.coerce.boolean().default(false),
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
     * Update role
     */
    if (data.checked === true) {
      await prisma.permissionString.create({
        data: {
          roleId: data.roleId,
          permissionString: data.permissionString,
        },
      });
    } else if (data.checked === false) {
      await prisma.permissionString.deleteMany({
        where: {
          roleId: data.roleId,
          permissionString: data.permissionString,
        },
      });
    }

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
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${data.roleId}/permissions`);
    revalidatePath("/app/iam/permission-matrix");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
