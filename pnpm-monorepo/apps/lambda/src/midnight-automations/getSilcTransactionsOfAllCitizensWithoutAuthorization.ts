import { prisma } from "@sam-monorepo/database";
import { captureAsyncFunc } from "../common/xray";

export const getSilcTransactionsOfAllCitizensWithoutAuthorization =
  async () => {
    return captureAsyncFunc(
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
    );
  };
