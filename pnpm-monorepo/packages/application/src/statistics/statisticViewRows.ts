import { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { getStatisticDefinition, StatisticKey } from "./statisticCatalog.js";

export interface StatisticValueRow {
  /** `YYYY-MM-DD` */
  readonly day: string;
  readonly seriesId: string;
  readonly seriesName: string;
  readonly value: number;
}

interface StatisticRowQuery {
  readonly key: StatisticKey;
  /** The first day, `YYYY-MM-DD` */
  readonly from: string;
  /** The last day, `YYYY-MM-DD` */
  readonly to: string;
  /**
   * Only the ship variants or the roles with these ids. Without ids, only the
   * ship variants or the roles with a value above 0 on a day of the range,
   * because the midnight jobs write a 0 for each of them.
   */
  readonly ids: readonly string[] | undefined;
}

/**
 * A column of type `integer` comes back as a number, a column of type
 * `bigint` (the fleet values, the SILC sums, a `sum()`) as a bigint. The
 * values of the statistics stay far below `Number.MAX_SAFE_INTEGER`, which
 * `z.int()` checks.
 */
const integerSchema = z
  .union([z.int(), z.bigint()])
  .transform(Number)
  .pipe(z.int());

const singleSeriesRowsSchema = z.array(
  z.object({ day: z.iso.date(), value: integerSchema }),
);

const multipleSeriesRowsSchema = z.array(
  z.object({
    day: z.iso.date(),
    seriesId: z.string(),
    seriesName: z.string(),
    value: integerSchema,
  }),
);

const acquisitionSourceRowsSchema = z.array(
  z.object({
    day: z.iso.date(),
    store: integerSchema,
    inGame: integerSchema,
    unknown: integerSchema,
  }),
);

enum AcquisitionSourceSeries {
  Total = "total",
  Store = "store",
  InGame = "in_game",
  Unknown = "unknown",
}

/** The series names of the fleet value panels, without the currency */
const ACQUISITION_SOURCE_SERIES_NAMES: Readonly<
  Record<AcquisitionSourceSeries, string>
> = {
  [AcquisitionSourceSeries.Total]: "Gesamt",
  [AcquisitionSourceSeries.Store]: "Store",
  [AcquisitionSourceSeries.InGame]: "In-game",
  [AcquisitionSourceSeries.Unknown]: "Nicht angegeben",
};

const dayFilter = ({ from, to }: StatisticRowQuery) =>
  Prisma.sql`"day" BETWEEN ${from}::date AND ${to}::date`;

/** @param source A query with the columns `day` and `value` */
const readSingleSeries = async (
  context: Pick<ApplicationContext, "prisma">,
  query: StatisticRowQuery,
  source: Prisma.Sql,
): Promise<StatisticValueRow[]> => {
  const rows = singleSeriesRowsSchema.parse(
    await context.prisma.$queryRaw<unknown[]>`
      SELECT "day"::text AS "day", "value"
      FROM (${source}) AS "source"
      WHERE ${dayFilter(query)}
    `,
  );
  const { key, title } = getStatisticDefinition(query.key);

  return rows.map((row) => ({
    day: row.day,
    seriesId: key,
    seriesName: title,
    value: row.value,
  }));
};

/**
 * @param columns The columns `store`, `inGame` and `unknown` of
 * `statistics.daily_fleet_values` in one currency
 */
const readAcquisitionSourceSeries = async (
  context: Pick<ApplicationContext, "prisma">,
  query: StatisticRowQuery,
  columns: Prisma.Sql,
): Promise<StatisticValueRow[]> => {
  const rows = acquisitionSourceRowsSchema.parse(
    await context.prisma.$queryRaw<unknown[]>`
      SELECT "day"::text AS "day", ${columns}
      FROM statistics.daily_fleet_values
      WHERE ${dayFilter(query)}
    `,
  );

  return rows.flatMap(({ day, store, inGame, unknown }) =>
    (
      [
        [AcquisitionSourceSeries.Total, store + inGame + unknown],
        [AcquisitionSourceSeries.Store, store],
        [AcquisitionSourceSeries.InGame, inGame],
        [AcquisitionSourceSeries.Unknown, unknown],
      ] as const
    ).map(([seriesId, value]) => ({
      day,
      seriesId,
      seriesName: ACQUISITION_SOURCE_SERIES_NAMES[seriesId],
      value,
    })),
  );
};

const readShipVariantSeries = async (
  context: Pick<ApplicationContext, "prisma">,
  query: StatisticRowQuery,
): Promise<StatisticValueRow[]> => {
  const seriesFilter = query.ids
    ? Prisma.sql`variant_id = ANY(${query.ids}::text[])`
    : Prisma.sql`variant_id IN (
        SELECT variant_id FROM statistics.daily_ship_counts
        WHERE ${dayFilter(query)} AND ship_count > 0
      )`;

  return multipleSeriesRowsSchema.parse(
    await context.prisma.$queryRaw<unknown[]>`
      SELECT
        "day"::text AS "day",
        variant_id AS "seriesId",
        variant_name AS "seriesName",
        ship_count AS "value"
      FROM statistics.daily_ship_counts
      WHERE ${dayFilter(query)} AND ${seriesFilter}
    `,
  );
};

/** All roles: the caller removes the roles that the actor cannot see */
const readRoleSeries = async (
  context: Pick<ApplicationContext, "prisma">,
  query: StatisticRowQuery,
): Promise<StatisticValueRow[]> => {
  const seriesFilter = query.ids
    ? Prisma.sql`role_id = ANY(${query.ids}::text[])`
    : Prisma.sql`role_id IN (
        SELECT role_id FROM statistics.daily_role_citizen_counts
        WHERE ${dayFilter(query)} AND citizen_count > 0
      )`;

  return multipleSeriesRowsSchema.parse(
    await context.prisma.$queryRaw<unknown[]>`
      SELECT
        "day"::text AS "day",
        role_id AS "seriesId",
        role_name AS "seriesName",
        citizen_count AS "value"
      FROM statistics.daily_role_citizen_counts
      WHERE ${dayFilter(query)} AND ${seriesFilter}
    `,
  );
};

/**
 * In no order. The view names, the column names and the filters are fixed SQL;
 * the days and the ids are bound parameters.
 */
export const readStatisticRows = (
  context: Pick<ApplicationContext, "prisma">,
  query: StatisticRowQuery,
): Promise<StatisticValueRow[]> => {
  switch (query.key) {
    case StatisticKey.FleetTotal:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`
          SELECT "day", sum(ship_count) AS "value"
          FROM statistics.daily_ship_counts
          GROUP BY "day"
        `,
      );

    case StatisticKey.ShipsPerVariant:
      return readShipVariantSeries(context, query);

    case StatisticKey.FleetValueUsd:
      return readAcquisitionSourceSeries(
        context,
        query,
        Prisma.sql`
          store_value_usd_cents AS "store",
          in_game_value_usd_cents AS "inGame",
          unknown_value_usd_cents AS "unknown"
        `,
      );

    case StatisticKey.FleetValueAuec:
      return readAcquisitionSourceSeries(
        context,
        query,
        Prisma.sql`
          store_value_auec AS "store",
          in_game_value_auec AS "inGame",
          unknown_value_auec AS "unknown"
        `,
      );

    case StatisticKey.Logins:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", login_count AS "value" FROM statistics.daily_login_counts`,
      );

    case StatisticKey.Citizens:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", citizen_total AS "value" FROM statistics.daily_citizen_totals`,
      );

    case StatisticKey.Organizations:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", organization_total AS "value" FROM statistics.daily_organization_totals`,
      );

    case StatisticKey.RegisteredUsers:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", user_total AS "value" FROM statistics.daily_user_totals`,
      );

    case StatisticKey.CitizensPerRole:
      return readRoleSeries(context, query);

    case StatisticKey.Events:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", event_count AS "value" FROM statistics.daily_event_counts`,
      );

    case StatisticKey.NewSilc:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", new_silc AS "value" FROM statistics.daily_new_silc`,
      );

    case StatisticKey.McpUsage:
      return readSingleSeries(
        context,
        query,
        Prisma.sql`SELECT "day", audit_event_count AS "value" FROM statistics.daily_mcp_usage_counts`,
      );

    default:
      throw new Error(`Unknown statistic: ${query.key satisfies never}`);
  }
};
