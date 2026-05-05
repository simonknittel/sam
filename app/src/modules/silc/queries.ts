import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity, SilcSettingKey } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getSilcBalanceOfCurrentCitizen = cache(
  withTrace("getSilcBalanceOfCurrentCitizen", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (
      !(await authentication.authorize("silcBalanceOfCurrentCitizen", "read"))
    )
      forbidden();

    const entity = await prisma.entity.findUniqueOrThrow({
      where: {
        id: authentication.session.entity.id,
      },
      select: {
        silcBalance: true,
      },
    });

    return entity.silcBalance;
  }),
);

export const getSilcBalanceOfAllCitizens = cache(
  withTrace("getSilcBalanceOfAllCitizens", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("silcBalanceOfOtherCitizen", "read")))
      forbidden();

    return await prisma.entity.findMany({
      where: {
        totalEarnedSilc: {
          not: {
            equals: 0,
          },
        },
      },
      select: {
        id: true,
        handle: true,
        silcBalance: true,
        totalEarnedSilc: true,
      },
      orderBy: {
        silcBalance: "desc",
      },
    });
  }),
);

export const getSilcTransactionsOfAllCitizens = cache(
  withTrace("getSilcTransactionsOfAllCitizens", async () => {
    const authentication = await requireAuthentication();
    if (
      !(await authentication.authorize("silcTransactionOfOtherCitizen", "read"))
    )
      forbidden();

    return await getSilcTransactionsOfAllCitizensWithoutAuthorization();
  }),
);

export const getSilcTransactionsOfAllCitizensWithoutAuthorization = cache(
  withTrace(
    "getSilcTransactionsOfAllCitizensWithoutAuthorization",
    async () => {
      return await prisma.silcTransaction.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
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
      });
    },
  ),
);

const SILC_TRANSACTIONS_PAGE_SIZE = 100;

export const getSilcTransactionsPaginated = cache(
  withTrace(
    "getSilcTransactionsPaginated",
    async (
      cursor: string | null = null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (
        !(await authentication.authorize("silcTransactionOfOtherCitizen", "read"))
      )
        forbidden();

      const take =
        direction === "prev"
          ? -(SILC_TRANSACTIONS_PAGE_SIZE + 1)
          : SILC_TRANSACTIONS_PAGE_SIZE + 1;

      const rows = await prisma.silcTransaction.findMany({
        where: {
          deletedAt: null,
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
        prevCursor: hasPrevPage && transactions.length > 0
          ? transactions[0].id
          : null,
      };
    },
  ),
);

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
        createdAt: "asc",
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
    });
  }),
);

export const getSilcSetting = cache(
  withTrace("getSilcSetting", async (key: SilcSettingKey) => {
    return prisma.silcSetting.findUnique({
      where: {
        key,
      },
    });
  }),
);

export const getRoleSalaries = cache(
  withTrace("getRoleSalaries", async () => {
    return prisma.silcRoleSalary.findMany();
  }),
);

export const getMonthlySalaryOfCurrentCitizen = cache(
  withTrace("monthlySalaryOfCurrentCitizen", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return null;
    if (
      !(await authentication.authorize("silcBalanceOfCurrentCitizen", "read"))
    )
      forbidden();

    const roleSalaries = await prisma.silcRoleSalary.findMany({
      where: {
        roleId: {
          in: authentication.session.entity.roleAssignments.map(
            (assignment) => assignment.roleId,
          ),
        },
      },
    });

    return roleSalaries.reduce((total, salary) => total + salary.value, 0);
  }),
);
