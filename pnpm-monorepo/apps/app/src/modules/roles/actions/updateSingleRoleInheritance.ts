"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z
  .object({
    roleId: z.cuid(),
    inheritedRoleId: z.cuid(),
    checked: z.coerce.boolean().default(false),
  })
  /**
   * A role that inherits itself adds nothing. The matrix leaves the diagonal
   * without a checkbox, the database rejects the row, and this keeps the
   * action from writing an audit event for a write that cannot happen.
   */
  .refine((data) => data.roleId !== data.inheritedRoleId);

export const updateSingleRoleInheritance = createAuthenticatedAction(
  "updateSingleRoleInheritance",
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
    await prisma.role.update({
      where: {
        id: data.roleId,
      },
      data: {
        inherits: data.checked
          ? { connect: { id: data.inheritedRoleId } }
          : { disconnect: { id: data.inheritedRoleId } },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_INHERITANCE_TOGGLED,
        data: {
          roleId: data.roleId,
          inheritedRoleId: data.inheritedRoleId,
          enabled: data.checked,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${data.roleId}/inheritance`);
    revalidatePath("/app/iam/inheritance-matrix");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
