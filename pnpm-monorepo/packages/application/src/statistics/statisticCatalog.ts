import {
  fromDateColumnValue,
  getYesterdayDateColumnValue,
  toLocalDateKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * The statistics of the dashboard of the app Statistiken. The views of the
 * schema `statistics` hold their values. The MCP tools and their tests read
 * this one list.
 */

/** The first day of the statistics. The views have no earlier day. */
export const FIRST_STATISTICS_DATE: LocalDate = {
  year: 2025,
  month: 12,
  day: 2,
};

/** `FIRST_STATISTICS_DATE` as `YYYY-MM-DD`, for descriptions and output */
export const FIRST_STATISTICS_DAY = toLocalDateKey(FIRST_STATISTICS_DATE);

/**
 * The last day of the statistics: yesterday in the time zone of the
 * organization. The views give only complete days.
 */
export const getLastStatisticsDate = (
  context: Pick<ApplicationContext, "now">,
): LocalDate => fromDateColumnValue(getYesterdayDateColumnValue(context.now()));

/** The order of the members is the order of the charts of the dashboard */
export enum StatisticKey {
  FleetTotal = "fleet_total",
  ShipsPerVariant = "ships_per_variant",
  FleetValueUsd = "fleet_value_usd",
  FleetValueAuec = "fleet_value_auec",
  Logins = "logins",
  Citizens = "citizens",
  Organizations = "organizations",
  RegisteredUsers = "registered_users",
  CitizensPerRole = "citizens_per_role",
  Events = "events",
  NewSilc = "new_silc",
  McpUsage = "mcp_usage",
}

export enum StatisticUnit {
  Count = "count",
  /** Like the values of the fleet tools */
  UsdCents = "usd_cents",
  Auec = "auec",
  Silc = "silc",
}

export enum StatisticValueKind {
  /** The state at the end of the day, for example the number of citizens */
  TotalAtEndOfDay = "total_at_end_of_day",
  /** What occurred on the day, for example the logins of the day */
  AmountOfDay = "amount_of_day",
}

/** The ids of the series of a statistic with one series for each item */
export enum StatisticIdsFilter {
  ShipVariants = "ship_variants",
  Roles = "roles",
}

export interface StatisticDefinition {
  readonly key: StatisticKey;
  /** German: the title of the chart in the app */
  readonly title: string;
  /** English: for the model of an MCP client */
  readonly description: string;
  readonly unit: StatisticUnit;
  readonly valueKind: StatisticValueKind;
  /**
   * False: one series with the key as its id and the title as its name. The
   * fleet values have four fixed series, the others one series for each item.
   */
  readonly hasMultipleSeries: boolean;
  /** The items of the series, or null for the other statistics */
  readonly idsFilter: StatisticIdsFilter | null;
}

const SINGLE_SERIES = { hasMultipleSeries: false, idsFilter: null } as const;

const ACQUISITION_SOURCE_SERIES = {
  hasMultipleSeries: true,
  idsFilter: null,
} as const;

const ACQUISITION_SOURCE_SERIES_DESCRIPTION =
  "Series: total, and one series for each acquisition source of the ships (store, in_game, and unknown for the ships without a source).";

const STATISTIC_DEFINITIONS: Readonly<
  Record<StatisticKey, Omit<StatisticDefinition, "key">>
> = {
  [StatisticKey.FleetTotal]: {
    title: "Flotte gesamt",
    description:
      "The number of ships that the members of the organization own.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.ShipsPerVariant]: {
    title: "Flotte",
    description:
      "The number of ships that the members of the organization own, one series for each ship variant.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    hasMultipleSeries: true,
    idsFilter: StatisticIdsFilter.ShipVariants,
  },
  [StatisticKey.FleetValueUsd]: {
    title: "Flottenwert (USD)",
    description: `The value of the ships of the members of the organization: the sum of the store prices of their variants, in USD cents. ${ACQUISITION_SOURCE_SERIES_DESCRIPTION}`,
    unit: StatisticUnit.UsdCents,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...ACQUISITION_SOURCE_SERIES,
  },
  [StatisticKey.FleetValueAuec]: {
    title: "Flottenwert (aUEC)",
    description: `The value of the ships of the members of the organization: the sum of the in-game prices of their variants, in aUEC. ${ACQUISITION_SOURCE_SERIES_DESCRIPTION}`,
    unit: StatisticUnit.Auec,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...ACQUISITION_SOURCE_SERIES,
  },
  [StatisticKey.Logins]: {
    title: "Logins",
    description: "The number of users who used the web app on the day.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.AmountOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.Citizens]: {
    title: "Citizens",
    description:
      "The number of citizens in SAM (members and other players) that are not deleted.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.Organizations]: {
    title: "Organisationen",
    description: "The number of organizations in SAM.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.RegisteredUsers]: {
    title: "Registrierte Benutzer",
    description: "The number of user accounts of SAM.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.CitizensPerRole]: {
    title: "Rollen",
    description:
      "The number of active citizens with the role, one series for each role that the user can see.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.TotalAtEndOfDay,
    hasMultipleSeries: true,
    idsFilter: StatisticIdsFilter.Roles,
  },
  [StatisticKey.Events]: {
    title: "Events",
    description:
      "The number of events that start on the day. Deleted events do not count.",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.AmountOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.NewSilc]: {
    title: "SILC",
    description:
      "The new SILC of the day: the sum of the positive SILC transactions that are not deleted.",
    unit: StatisticUnit.Silc,
    valueKind: StatisticValueKind.AmountOfDay,
    ...SINGLE_SERIES,
  },
  [StatisticKey.McpUsage]: {
    title: "MCP-Nutzung",
    description:
      "The number of system log entries of the day that an MCP client caused (not the number of tool calls).",
    unit: StatisticUnit.Count,
    valueKind: StatisticValueKind.AmountOfDay,
    ...SINGLE_SERIES,
  },
};

export const getStatisticDefinition = (
  key: StatisticKey,
): StatisticDefinition => ({ key, ...STATISTIC_DEFINITIONS[key] });

/** In the order of the charts of the dashboard */
export const STATISTIC_CATALOG: readonly StatisticDefinition[] = Object.values(
  StatisticKey,
).map(getStatisticDefinition);
