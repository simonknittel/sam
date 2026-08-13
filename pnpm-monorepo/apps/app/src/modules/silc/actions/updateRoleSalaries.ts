"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  roleIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  values: z.array(z.coerce.number()).max(250), // Arbitrary (untested) limit to prevent DDoS
  dayOfMonths: z.array(z.coerce.number().min(1).max(31)).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const updateRoleSalaries = createAuthenticatedAction(
  "updateRoleSalaries",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("silcSetting", "update")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update salaries
     */
    await prisma.$transaction([
      prisma.silcRoleSalary.deleteMany(),

      prisma.silcRoleSalary.createMany({
        data: data.roleIds.map((roleId, index) => ({
          roleId,
          dayOfMonth: data.dayOfMonths[index],
          value: data.values[index],
        })),
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.SALARY_CONFIG_UPDATED,
        data: {
          roleIds: data.roleIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc/settings");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      roleIds: formData.getAll("roleId[]"),
      values: formData.getAll("value[]"),
      dayOfMonths: formData.getAll("dayOfMonth[]"),
    }),
  },
);
