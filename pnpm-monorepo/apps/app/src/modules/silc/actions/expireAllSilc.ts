"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

const schema = z.object({});

export const expireAllSilc = createAuthenticatedAction(
  "expireAllSilc",
  schema,
  async (formData, authentication, _data, t) => {
    if (
      !(await authentication.authorize("silcBalanceOfOtherCitizen", "manage"))
    )
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
     * Update citizens' balances
     */
    const citizens = await prisma.entity.findMany({
      select: { id: true, silcBalance: true },
      where: { silcBalance: { gt: 0 } },
    });

    await prisma.silcTransaction.createMany({
      data: citizens.map((citizen) => ({
        receiverId: citizen.id,
        value: -citizen.silcBalance,
        description: "Verfallen",
        createdById: authentication.session.entity!.id,
      })),
    });

    await updateCitizensSilcBalances(citizens.map((citizen) => citizen.id));

    await createAuditEvents([
      {
        type: AuditEventType.SILC_ALL_EXPIRED,
        data: {
          citizenCount: citizens.length,
          expiredValue: citizens.reduce(
            (sum, citizen) => sum + citizen.silcBalance,
            0,
          ),
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
