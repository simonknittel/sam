import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getPenaltyEntriesOfCurrentUser = cache(
  withTrace("getPenaltyEntriesOfCurrentUser", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) throw new Error("Forbidden");
    if (!(await authentication.authorize("ownPenaltyEntry", "read")))
      throw new Error("Forbidden");

    const now = new Date();

    return prisma.penaltyEntry.findMany({
      where: {
        deletedAt: null,
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
        citizenId: authentication.session.entity.id,
      },
    });
  }),
);
