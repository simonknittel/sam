"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ACTIVE_CITIZEN_WHERE, updateSilcBalances } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";

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
     * Books every positive balance away. The balances come from the ledger
     * inside the same transaction, not from the cached copy.
     */
    const createdById = authentication.session.entity.id;
    const citizens = await prisma.$transaction(async (transaction) => {
      const balances = await transaction.silcTransaction.groupBy({
        by: ["receiverId"],
        where: { deletedAt: null, receiver: ACTIVE_CITIZEN_WHERE },
        _sum: { value: true },
        having: { value: { _sum: { gt: 0 } } },
      });
      const expiring = balances.map((balance) => ({
        id: balance.receiverId,
        silcBalance: balance._sum.value ?? 0,
      }));

      await transaction.silcTransaction.createMany({
        data: expiring.map((citizen) => ({
          receiverId: citizen.id,
          value: -citizen.silcBalance,
          description: "Verfallen",
          createdById,
        })),
      });
      await updateSilcBalances(
        transaction,
        expiring.map((citizen) => citizen.id),
      );

      return expiring;
    });

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
