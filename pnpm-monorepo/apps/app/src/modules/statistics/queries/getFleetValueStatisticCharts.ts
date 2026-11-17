import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findDailyFleetValueRows,
  type DailyFleetValueRow,
} from "@sam-monorepo/application";
import { cache } from "react";
import {
  buildChartData,
  buildTotalAndDeltaChart,
  normalizeOptions,
  type StatisticChartData,
} from "../utils/chartData";

type ValueKey = keyof Omit<DailyFleetValueRow, "day">;

interface Currency {
  readonly id: string;
  readonly totalName: string;
  readonly storeKey: ValueKey;
  readonly inGameKey: ValueKey;
  readonly unknownKey: ValueKey;
  /** The charts show whole amounts */
  readonly toChartValue: (amount: number) => number;
}

const USD: Currency = {
  id: "fleet-value-usd",
  totalName: "Gesamt (USD)",
  storeKey: "storeValueUsdCents",
  inGameKey: "inGameValueUsdCents",
  unknownKey: "unknownValueUsdCents",
  toChartValue: (cents) => Math.round(cents / 100),
};

const AUEC: Currency = {
  id: "fleet-value-auec",
  totalName: "Gesamt (aUEC)",
  storeKey: "storeValueAuec",
  inGameKey: "inGameValueAuec",
  unknownKey: "unknownValueAuec",
  toChartValue: (auec) => auec,
};

/**
 * The total value with its change to the day before, plus one line for each
 * acquisition source on the same axis as the total
 */
const buildFleetValueChart = (
  rows: readonly DailyFleetValueRow[],
  options: ReturnType<typeof normalizeOptions>,
  currency: Currency,
): StatisticChartData => {
  const totalChart = buildTotalAndDeltaChart(
    rows.map((row) => ({
      createdAt: row.day,
      count: currency.toChartValue(
        row[currency.storeKey] +
          row[currency.inGameKey] +
          row[currency.unknownKey],
      ),
    })),
    options,
    currency.id,
    currency.totalName,
    {},
  );

  const sources = [
    { name: "Store", key: currency.storeKey },
    { name: "In-game", key: currency.inGameKey },
    { name: "Nicht angegeben", key: currency.unknownKey },
  ];
  const sourceChart = buildChartData(
    sources.flatMap(({ name, key }) =>
      rows.map((row) => ({
        id: `${currency.id}-${key}`,
        name,
        createdAt: row.day,
        count: currency.toChartValue(row[key]),
      })),
    ),
    options,
  );

  return {
    ...totalChart,
    series: [...totalChart.series, ...sourceChart.series],
  };
};

/** The charts of the fleet value in USD and in aUEC, from one read */
export const getFleetValueStatisticCharts = cache(
  withTrace("getFleetValueStatisticCharts", async () => {
    const options = normalizeOptions();

    let rows: DailyFleetValueRow[];
    try {
      rows = await findDailyFleetValueRows(
        getApplicationContext(),
        await getRequestActor(),
        { fromDay: options.fromDateColumnValue },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }

    return {
      usd: buildFleetValueChart(rows, options, USD),
      auec: buildFleetValueChart(rows, options, AUEC),
    };
  }),
);
