"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { bookPositiveBalancesAway, lockSilcLedger } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
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

    const createdById = authentication.session.entity.id;
    const { balances } = await prisma.$transaction(async (transaction) => {
      await lockSilcLedger(transaction);

      return bookPositiveBalancesAway(transaction, {
        description: "Verfallen",
        createdById,
      });
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.SILC_ALL_EXPIRED,
        data: {
          citizenCount: balances.length,
          expiredValue: balances.reduce(
            (sum, balance) => sum + balance.value,
            0,
          ),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
);
