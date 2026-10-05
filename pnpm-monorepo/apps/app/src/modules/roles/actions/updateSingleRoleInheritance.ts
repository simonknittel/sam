"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z
  .object({
    roleId: z.cuid(),
    inheritedRoleId: z.cuid(),
    checked: z.stringbool(),
  })
  /**
   * A role that inherits itself adds nothing. The matrix leaves the diagonal
   * without a checkbox, the database rejects the row, and this keeps the
   * action from writing an audit event for a write that cannot happen.
   */
  .refine((data) => data.roleId !== data.inheritedRoleId, {
    error: "A role cannot inherit itself",
  });

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
     * Update role. The update fails with P2025 when the role or the role to
     * connect is gone.
     */
    const isUpdated = await prisma.role
      .update({
        where: {
          id: data.roleId,
        },
        data: {
          inherits: data.checked
            ? { connect: { id: data.inheritedRoleId } }
            : { disconnect: { id: data.inheritedRoleId } },
        },
        select: { id: true },
      })
      .then(() => true)
      .catch((error: unknown) => {
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) return false;
        throw error;
      });

    /**
     * Also for the error below: then a different user deleted one of the
     * roles, and the page must show it.
     */
    refresh();

    if (!isUpdated)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

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
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
