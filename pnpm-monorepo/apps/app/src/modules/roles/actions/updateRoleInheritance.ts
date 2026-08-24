"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
  roles: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
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

    const role = await prisma.role.findUnique({
      where: {
        id: data.id,
      },
      select: {
        id: true,
      },
    });
    if (!role)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    /**
     * Update role
     */
    await prisma.role.update({
      where: {
        id: data.id,
      },
      data: {
        inherits: {
          set: data.roles.map((id) => ({ id })),
        },
      },
    });

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
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${data.id}`);

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
