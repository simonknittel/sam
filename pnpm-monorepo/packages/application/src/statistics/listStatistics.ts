import { toLocalDateKey } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  FIRST_STATISTICS_DAY,
  getLastStatisticsDate,
  STATISTIC_CATALOG,
  type StatisticIdsFilter,
  type StatisticKey,
  type StatisticUnit,
  type StatisticValueKind,
} from "./statisticCatalog.js";

export const listStatisticsInputSchema = z.strictObject({});

export interface StatisticOutput {
  readonly key: StatisticKey;
  /** German: the title of the chart in the app */
  readonly title: string;
  readonly description: string;
  readonly unit: StatisticUnit;
  readonly value_kind: StatisticValueKind;
  readonly has_multiple_series: boolean;
  /** The items of the series that `get_statistic` can filter by id, or null */
  readonly ids_filter: StatisticIdsFilter | null;
}

export interface ListStatisticsOutput {
  readonly statistics: StatisticOutput[];
  /** `YYYY-MM-DD` */
  readonly first_day: string;
  /** Yesterday in the time zone of the organization, `YYYY-MM-DD` */
  readonly last_day: string;
}

/**
 * The statistics of the dashboard of the app Statistiken, in the order of the
 * charts, with the first and the last day of the statistics
 *
 * @throws ForbiddenError without `globalStatistics;read`
 */
export const listStatistics = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<ListStatisticsOutput> => {
  requirePermission(actor, "globalStatistics", "read");

  return {
    statistics: STATISTIC_CATALOG.map((statistic) => ({
      key: statistic.key,
      title: statistic.title,
      description: statistic.description,
      unit: statistic.unit,
      value_kind: statistic.valueKind,
      has_multiple_series: statistic.hasMultipleSeries,
      ids_filter: statistic.idsFilter,
    })),
    first_day: FIRST_STATISTICS_DAY,
    last_day: toLocalDateKey(getLastStatisticsDate(context)),
  };
};
