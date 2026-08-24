"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

const schema = z.object({});

export const refreshSilcBalances = createAuthenticatedAction(
  "refreshSilcBalances",
  schema,
  async (formData, authentication, _data, t) => {
    if (
      !(await authentication.authorize("silcBalanceOfOtherCitizen", "manage"))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update citizens' balances
     */
    const citizens = await prisma.entity.findMany({
      select: {
        id: true,
      },
    });
    await updateCitizensSilcBalances(citizens.map((citizen) => citizen.id));

    await createAuditEvents([
      {
        type: AuditEventType.SILC_BALANCES_REFRESHED,
        data: {
          citizenCount: citizens.length,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc");
    revalidatePath("/app/silc/transactions");
    revalidatePath("/app/dashboard");

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
);
