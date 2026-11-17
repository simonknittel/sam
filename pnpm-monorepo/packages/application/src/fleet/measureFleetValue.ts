import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getLocalDate,
  getStartOfLocalDay,
  getYesterdayDateColumnValue,
  ORG_ID,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { sumFleetValue } from "./shipAcquisitionSource.js";

export interface MeasureFleetValueOutput {
  /** The measured day as "YYYY-MM-DD" */
  readonly date: string;
  /** The members of the organization whose ships the run counted */
  readonly memberCount: number;
  readonly storeValueUsdCents: number;
  readonly inGameValueUsdCents: number;
  readonly unknownValueUsdCents: number;
  readonly storeValueAuec: number;
  readonly inGameValueAuec: number;
  readonly unknownValueAuec: number;
  /**
   * False without members, and when an earlier run saved the values of this
   * day already
   */
  readonly saved: boolean;
}

/**
 * Saves the value of the ships of the members of the organization for each
 * acquisition source, for the day that just ended: the day before the time
 * of the run in the time zone of the organization. A ship counts with the
 * current store price of its variant. The members are the same as the
 * members of `countShips()`. Without members the run saves nothing.
 */
export const measureFleetValue = (
  context: ApplicationContext,
): Promise<MeasureFleetValueOutput> =>
  withSpan(context, "measureFleetValue", async () => {
    const now = context.now();
    const measuredDay = getYesterdayDateColumnValue(now);
    const date = measuredDay.toISOString().slice(0, 10);

    const memberships =
      await context.prisma.activeOrganizationMembership.findMany({
        where: { organizationId: ORG_ID, citizen: ACTIVE_CITIZEN_WHERE },
        select: { citizenId: true },
      });
    if (memberships.length === 0)
      return {
        date,
        memberCount: 0,
        storeValueUsdCents: 0,
        inGameValueUsdCents: 0,
        unknownValueUsdCents: 0,
        storeValueAuec: 0,
        inGameValueAuec: 0,
        unknownValueAuec: 0,
        saved: false,
      };

    const ships = await context.prisma.ship.findMany({
      where: {
        deletedAt: null,
        ownerId: { in: memberships.map((membership) => membership.citizenId) },
      },
      select: {
        acquisitionSource: true,
        variant: {
          select: { storePriceUsdCents: true, inGamePriceAuec: true },
        },
      },
    });

    const value = sumFleetValue(
      ships.map((ship) => ({
        acquisitionSource: ship.acquisitionSource,
        storePriceUsdCents: ship.variant.storePriceUsdCents,
        inGamePriceAuec: ship.variant.inGamePriceAuec,
      })),
    );
    const values = {
      storeValueUsdCents: value.usd_cents.store,
      inGameValueUsdCents: value.usd_cents.in_game,
      unknownValueUsdCents: value.usd_cents.unknown,
      storeValueAuec: value.auec.store,
      inGameValueAuec: value.auec.in_game,
      unknownValueAuec: value.auec.unknown,
    };

    /**
     * A run that repeats in the same night (for example after an error in a
     * later job) keeps the values of the first run, like `countShips()`.
     */
    const created = await context.prisma.dailyFleetValue.createMany({
      data: [
        {
          day: measuredDay,
          storeValueUsdCents: BigInt(values.storeValueUsdCents),
          inGameValueUsdCents: BigInt(values.inGameValueUsdCents),
          unknownValueUsdCents: BigInt(values.unknownValueUsdCents),
          storeValueAuec: BigInt(values.storeValueAuec),
          inGameValueAuec: BigInt(values.inGameValueAuec),
          unknownValueAuec: BigInt(values.unknownValueAuec),
        },
      ],
      skipDuplicates: true,
    });
    if (created.count <= 0)
      return { date, memberCount: memberships.length, ...values, saved: false };

    const today = getLocalDate(now, ORGANIZATION_TIMEZONE);
    const startOfMeasuredDay = getStartOfLocalDay(
      { ...today, day: today.day - 1 },
      ORGANIZATION_TIMEZONE,
    );

    await context.audit.create([
      {
        type: AuditEventType.FLEET_VALUE_MEASURED,
        data: { date: startOfMeasuredDay.toISOString(), ...values },
        createdById: null,
      },
    ]);

    return { date, memberCount: memberships.length, ...values, saved: true };
  });
