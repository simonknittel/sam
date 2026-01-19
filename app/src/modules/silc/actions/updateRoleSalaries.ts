"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({
  roleIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  values: z.array(z.coerce.number()).max(250), // Arbitrary (untested) limit to prevent DDoS
  dayOfMonths: z.array(z.coerce.number().min(1).max(31)).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const updateRoleSalaries = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication =
      await requireAuthenticationAction("updateRoleSalaries");
    await authentication.authorizeAction("silcSetting", "update");
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      roleIds: formData.getAll("roleId[]"),
      values: formData.getAll("value[]"),
      dayOfMonths: formData.getAll("dayOfMonth[]"),
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    /**
     * Update salaries
     */
    await prisma.$transaction([
      prisma.silcRoleSalary.deleteMany(),

      prisma.silcRoleSalary.createMany({
        data: result.data.roleIds.map((roleId, index) => ({
          roleId,
          dayOfMonth: result.data.dayOfMonths[index],
          value: result.data.values[index],
        })),
      }),
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
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
