"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  ACTIVE_CITIZEN_WHERE,
  DELETED_CITIZEN_LABEL,
} from "@sam-monorepo/domain";
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
     * the login continues as a login without a citizen. The log tables and
     * the system log name the author by `User.name`, thus the login gets the
     * label of a deleted citizen. The login update comes first, because it
     * finds the login through the link.
     */
    const [, deletedCitizens] = await prisma.$transaction([
      prisma.user.updateMany({
        where: { citizen: { id: data.id, ...ACTIVE_CITIZEN_WHERE } },
        data: { name: DELETED_CITIZEN_LABEL },
      }),

      prisma.citizen.updateManyAndReturn({
        where: { id: data.id, ...ACTIVE_CITIZEN_WHERE },
        data: {
          deletedAt: new Date(),
          deletedById: authentication.session.entity?.id ?? null,
          userId: null,
        },
        select: { spectrumId: true },
      }),
    ]);

    const deletedCitizen = deletedCitizens[0];
    if (!deletedCitizen)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_DELETED,
        data: {
          citizenId: data.id,
          spectrumId: deletedCitizen.spectrumId || "",
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
