"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { updateSilcBalances } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

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
    const citizens = await prisma.citizen.findMany({
      select: {
        id: true,
      },
    });
    await prisma.$transaction((transaction) =>
      updateSilcBalances(
        transaction,
        citizens.map((citizen) => citizen.id),
      ),
    );

    await createAuditEvents([
      {
        type: AuditEventType.SILC_BALANCES_REFRESHED,
        data: {
          citizenCount: citizens.length,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    refresh();

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  },
);
