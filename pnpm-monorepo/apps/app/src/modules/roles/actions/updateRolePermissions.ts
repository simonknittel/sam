"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  permissionStrings: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .regex(/^[\w\-]+;[\w\-]+(?:;[\w\-]+=[\w\-\*]+)*$/),
    )
    .max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const updateRolePermissions = createAuthenticatedAction(
  "updateRolePermissions",
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
    await prisma.$transaction([
      prisma.permissionString.deleteMany({
        where: {
          roleId: data.id,
        },
      }),

      ...data.permissionStrings.map((permissionString) => {
        return prisma.permissionString.create({
          data: {
            roleId: data.id,
            permissionString,
          },
        });
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
        data: {
          roleId: data.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${data.id}/permissions`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      permissionStrings: Array.from(formData.keys()).filter(
        (key) => key !== "id" && !key.startsWith("$ACTION"),
      ),
    }),
  },
);
