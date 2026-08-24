import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { SILC_TRANSACTION_TABLE_SELECT } from "./silcTransactionTableSelect";

export const getSilcTransactionsOfCitizen = cache(
  withTrace("getSilcTransactionsOfCitizen", async (citizenId: Entity["id"]) => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (
      !(await authentication.authorize(
        "silcTransactionOfOtherCitizen",
        "read",
      )) &&
      !(
        citizenId === authentication.session.entity.id &&
        (await authentication.authorize(
          "silcTransactionOfCurrentCitizen",
          "read",
        ))
      )
    )
      forbidden();

    return prisma.silcTransaction.findMany({
      where: {
        receiverId: citizenId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: SILC_TRANSACTION_TABLE_SELECT,
    });
  }),
);
