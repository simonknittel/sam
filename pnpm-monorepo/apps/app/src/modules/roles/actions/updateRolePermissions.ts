"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { Prisma } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

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
     * Update role. The update fails with P2025 when the role is gone.
     */
    const isUpdated = await prisma.role
      .update({
        where: {
          id: data.id,
        },
        data: {
          permissionStrings: {
            deleteMany: {},
            createMany: {
              data: data.permissionStrings.map((permissionString) => ({
                permissionString,
              })),
              skipDuplicates: true,
            },
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
        type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
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
      permissionStrings: Array.from(formData.keys()).filter(
        (key) => key !== "id" && !key.startsWith("$ACTION"),
      ),
    }),
  },
);
