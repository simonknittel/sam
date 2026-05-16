import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

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
