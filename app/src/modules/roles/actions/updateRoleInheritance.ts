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
  id: z.cuid(),
  roles: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const updateRoleInheritance = async (
  previousState: unknown,
  formData: FormData,
) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction(
      "updateRoleInheritance",
    );
    await authentication.authorizeAction("role", "manage");

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      id: formData.get("id"),
      roles: formData.getAll("roles"),
    });
    if (!result.success) {
      log.warn("Bad Request", { error: serializeError(result.error) });
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    /**
     * Update role
     */
    await prisma.role.update({
      where: {
        id: result.data.id,
      },
      data: {
        inherits: {
          set: result.data.roles.map((id) => ({ id })),
        },
      },
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/roles/${result.data.id}`);

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
