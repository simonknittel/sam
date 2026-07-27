import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const SILC_TRANSACTIONS_PAGE_SIZE = 100;

export const getSilcTransactionsPaginated = cache(
  withTrace(
    "getSilcTransactionsPaginated",
    async (
      showDeleted: "alle" | "deleted" = "alle",
      cursor: string | null = null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (
        !(await authentication.authorize(
          "silcTransactionOfOtherCitizen",
          "read",
        ))
      )
        forbidden();

      const take =
        direction === "prev"
          ? -(SILC_TRANSACTIONS_PAGE_SIZE + 1)
          : SILC_TRANSACTIONS_PAGE_SIZE + 1;

      const rows = await prisma.silcTransaction.findMany({
        where:
          showDeleted === "alle"
            ? {
                deletedAt: null,
              }
            : {
                deletedAt: { not: null },
              },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          receiver: {
            select: {
              id: true,
              handle: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              handle: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        take,
      });

      const hasMore = rows.length > SILC_TRANSACTIONS_PAGE_SIZE;

      let transactions;
      if (hasMore) {
        if (direction === "prev") {
          transactions = rows.slice(1);
        } else {
          transactions = rows.slice(0, SILC_TRANSACTIONS_PAGE_SIZE);
        }
      } else {
        transactions = rows;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        transactions,
        nextCursor:
          hasNextPage && transactions.length > 0
            ? transactions[transactions.length - 1].id
            : null,
        prevCursor:
          hasPrevPage && transactions.length > 0 ? transactions[0].id : null,
      };
    },
  ),
);
