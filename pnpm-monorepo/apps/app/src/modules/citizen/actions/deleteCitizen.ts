"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteCitizen = createAuthenticatedAction(
  "deleteCitizen",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("citizen", "delete")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Soft delete: the citizen and all its entries stay in the database and
     * are hidden (see `Citizen.deletedAt`). The link to the login goes, thus
     * the login continues as a login without a citizen.
     */
    const { count } = await prisma.citizen.updateMany({
      where: { id: data.id, ...ACTIVE_CITIZEN_WHERE },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
        userId: null,
      },
    });
    if (count === 0)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const { spectrumId } = await prisma.citizen.findUniqueOrThrow({
      where: { id: data.id },
      select: { spectrumId: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_DELETED,
        data: {
          citizenId: data.id,
          spectrumId: spectrumId || "",
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/spynet", "layout");

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
