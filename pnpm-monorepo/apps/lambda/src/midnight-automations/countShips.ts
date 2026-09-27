import { prisma, type Organization } from "@sam-monorepo/database";
import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getLocalDate,
  ORG_ID,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

const getActiveOrganizationMemberships = async (id: Organization["id"]) => {
  return await captureAsyncFunc(
    "getActiveOrganizationMemberships",
    async () => {
      const memberships = await prisma.activeOrganizationMembership.findMany({
        where: {
          organizationId: id,
          citizen: ACTIVE_CITIZEN_WHERE,
        },
        select: {
          citizenId: true,
        },
      });

      return memberships;
    },
  );
};

const getVariantCounts = async (citizenIds: string[]) => {
  return await captureAsyncFunc("getVariantCounts", async () => {
    const variantCounts = await prisma.ship.groupBy({
      where: {
        deletedAt: null,
        ownerId: {
          in: citizenIds,
        },
      },
      by: ["variantId"],
      _count: {
        id: true,
      },
    });

    return variantCounts;
  });
};

const getAllVariants = async () => {
  return await captureAsyncFunc("getAllVariants", async () => {
    const variants = await prisma.variant.findMany({
      select: {
        id: true,
      },
    });

    return variants;
  });
};

export const countShips = async () => {
  await captureAsyncFunc("countShips", async () => {
    /**
     * The job runs at midnight and counts the day that just ended. Day 0 of
     * a month is the last day of the month before, see `toDateColumnValue()`.
     */
    const today = getLocalDate(new Date(), ORGANIZATION_TIMEZONE);
    const countedDay = toDateColumnValue({ ...today, day: today.day - 1 });

    const memberships = await getActiveOrganizationMemberships(ORG_ID);
    const citizenIds = memberships.map((membership) => membership.citizenId);
    if (citizenIds.length === 0) {
      log.info("No active organization memberships found");
      return;
    }

    const [allVariants, variantCounts] = await Promise.all([
      getAllVariants(),
      getVariantCounts(citizenIds),
    ]);

    const variantCountMap = new Map(
      variantCounts.map((variantCount) => [
        variantCount.variantId,
        variantCount._count.id,
      ]),
    );

    const data = allVariants.map((variant) => ({
      variantId: variant.id,
      day: countedDay,
      count: variantCountMap.get(variant.id) ?? 0,
    }));

    /**
     * A run that repeats in the same night keeps the counts of the first run,
     * see `countCitizensPerRole()`.
     */
    const created = await captureAsyncFunc("save variant ship counts", () =>
      prisma.variantShipCount.createMany({
        data,
        skipDuplicates: true,
      }),
    );

    await createAuditEvents([
      {
        type: AuditEventType.SHIPS_PER_VARIANT_COUNTED,
        data: { variantCount: data.length },
      },
    ]);

    log.info("Saved ships per variant statistics", { count: created.count });
  });
};
