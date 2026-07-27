import { prisma } from "@/db";
import { type Entity } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";

const buildExpiredWhereClause = (expired: "active" | "all") => {
  if (expired === "active") {
    const now = new Date();
    return {
      OR: [
        {
          expiresAt: {
            gte: now,
          },
        },
        {
          expiresAt: null,
        },
      ],
    };
  }
  return {};
};

export const getEntriesOfCitizen = withTrace(
  "getEntriesOfCitizen",
  async (citizenId: Entity["id"], expired: "active" | "all" = "active") => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) throw new Error("Forbidden");
    if (
      !(await authentication.authorize("penaltyEntry", "read")) &&
      !(
        citizenId === authentication.session.entity.id &&
        (await authentication.authorize("ownPenaltyEntry", "read"))
      )
    )
      throw new Error("Forbidden");

    return prisma.penaltyEntry.findMany({
      where: {
        citizenId,
        deletedAt: null,
        ...buildExpiredWhereClause(expired),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        citizen: true,
        createdBy: true,
      },
    });
  },
);
