"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { Prisma } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z
  .object({
    id: z.cuid(),
    roles: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  })
  /**
   * A role that inherits itself adds nothing. The form leaves the role out
   * of its own list, and the database rejects the row either way.
   */
  .refine((data) => !data.roles.includes(data.id), {
    error: "A role cannot inherit itself",
  });

export const updateRoleInheritance = createAuthenticatedAction(
  "updateRoleInheritance",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("role", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update role. The update fails with P2025 when the role or a role to
     * inherit is gone.
     */
    const isUpdated = await prisma.role
      .update({
        where: {
          id: data.id,
        },
        data: {
          inherits: {
            set: data.roles.map((id) => ({ id })),
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
        type: AuditEventType.ROLE_INHERITANCE_UPDATED,
        data: {
          roleId: data.id,
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
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      roles: formData.getAll("roles"),
    }),
  },
);
