import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getYesterdayDateColumnValue,
  ORG_ID,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export interface CountShipsOutput {
  readonly memberCount: number;
  readonly variantCount: number;
  /** Zero for a repeated run */
  readonly savedCount: number;
}

/**
 * Counts the day that just ended: the day before the run in the time zone of
 * the organization. All members count, also the members with a redacted
 * membership.
 */
export const countShips = (
  context: ApplicationContext,
): Promise<CountShipsOutput> =>
  withSpan(context, "countShips", async () => {
    const countedDay = getYesterdayDateColumnValue(context.now());

    const memberships =
      await context.prisma.activeOrganizationMembership.findMany({
        where: { organizationId: ORG_ID, citizen: ACTIVE_CITIZEN_WHERE },
        select: { citizenId: true },
      });
    if (memberships.length === 0)
      return { memberCount: 0, variantCount: 0, savedCount: 0 };

    const [variants, shipCounts] = await Promise.all([
      context.prisma.variant.findMany({ select: { id: true } }),
      context.prisma.ship.groupBy({
        by: ["variantId"],
        where: {
          deletedAt: null,
          ownerId: {
            in: memberships.map((membership) => membership.citizenId),
          },
        },
        _count: { id: true },
      }),
    ]);

    const shipCountByVariantId = new Map(
      shipCounts.map((shipCount) => [shipCount.variantId, shipCount._count.id]),
    );

    const data = variants.map((variant) => ({
      variantId: variant.id,
      day: countedDay,
      count: shipCountByVariantId.get(variant.id) ?? 0,
    }));

    const created = await context.prisma.variantShipCount.createMany({
      data,
      skipDuplicates: true,
    });

    await context.audit.create([
      {
        type: AuditEventType.SHIPS_PER_VARIANT_COUNTED,
        data: { variantCount: data.length },
        createdById: null,
      },
    ]);

    return {
      memberCount: memberships.length,
      variantCount: data.length,
      savedCount: created.count,
    };
  });
