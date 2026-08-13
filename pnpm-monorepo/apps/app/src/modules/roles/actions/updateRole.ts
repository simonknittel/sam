"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2048).nullish(),
  maxAgeDays: z.coerce.number().min(1).max(10_000).nullish(),
  assignAfterInactiveDays: z.coerce.number().min(1).max(10_000).nullish(),
  // inactivityThreshold: z.coerce.number().min(1).max(10_000).nullish(),
  maxLevel: z.coerce.number().min(1).max(100).nullish(),
});

export const updateRole = createAuthenticatedAction(
  "updateRole",
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
    const existingRole = await prisma.role.findUnique({
      where: {
        id: data.id,
      },
      select: {
        name: true,
        description: true,
        maxAgeDays: true,
        assignAfterInactiveDays: true,
      },
    });
    if (!existingRole)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedRole = await prisma.role.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
        maxAgeDays: data.maxAgeDays,
        assignAfterInactiveDays: data.assignAfterInactiveDays,
        // inactivityThreshold: data.inactivityThreshold,
        maxLevel: data.maxLevel,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_UPDATED_V3,
        data: {
          roleId: updatedRole.id,
          previousName: existingRole.name,
          newName: updatedRole.name,
          previousMaxAgeDays: existingRole.maxAgeDays ?? null,
          newMaxAgeDays: updatedRole.maxAgeDays,
          previousAssignAfterInactiveDays:
            existingRole.assignAfterInactiveDays ?? null,
          newAssignAfterInactiveDays: updatedRole.assignAfterInactiveDays,
          previousDescription: existingRole.description ?? null,
          newDescription: updatedRole.description,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${updatedRole.id}`);
    revalidatePath("/app/iam/roles");

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
      name: formData.get("name"),
      description: formData.get("description") || null,
      maxAgeDays: formData.get("maxAgeDays")
        ? Number(formData.get("maxAgeDays"))
        : null,
      assignAfterInactiveDays: formData.get("assignAfterInactiveDays")
        ? Number(formData.get("assignAfterInactiveDays"))
        : null,
      // inactivityThreshold: formData.get("inactivityThreshold")
      //   ? Number(formData.get("inactivityThreshold"))
      //   : null,
      maxLevel: formData.get("maxLevel")
        ? Number(formData.get("maxLevel"))
        : null,
    }),
  },
);
