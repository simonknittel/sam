import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type Citizen } from "@sam-monorepo/database/client";
import { buildActivePenaltyEntryWhere } from "../utils/penaltyEntryFilters";

export const getEntriesOfCitizen = withTrace(
  "getEntriesOfCitizen",
  async (citizenId: Citizen["id"], expired: "active" | "all" = "active") => {
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
        ...(expired === "active"
          ? buildActivePenaltyEntryWhere()
          : { deletedAt: null }),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        citizen: { select: { id: true, handle: true, deletedAt: true } },
        createdBy: { select: { id: true, handle: true, deletedAt: true } },
      },
    });
  },
);
