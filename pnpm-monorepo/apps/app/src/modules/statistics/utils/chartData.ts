import {
  getLocalDate,
  getLocalDateKey,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  wallTimeToInstant,
} from "@sam-monorepo/domain";

interface ChartConfiguration {
  /**
   * The maximum number of series in the chart. The chart keeps the series
   * with the highest last value.
   */
  readonly top?: number;
  readonly filterEmpty?: boolean;
}

interface MultiLineRecord {
  id: string;
  name: string;
  /**
   * An instant or the value of a `@db.Date` column (midnight UTC). The record
   * goes to the chart day of this value in the time zone of the organization.
   * This zone is always ahead of UTC, thus a `@db.Date` value goes to its own
   * day.
   */
  createdAt: Date;
  count: number;
}

interface AxisPoint {
  key: string;
  /** The `@db.Date` value of the chart day */
  timestamp: number;
}

/**
 * The chart days are the days of the time zone of the organization. The
 * chart ends with yesterday.
 */
interface NormalizedOptions {
  /** The start of the first chart day */
  fromDate: Date;
  /** The `@db.Date` value of the first chart day */
  fromDateColumnValue: Date;
  /** The start of today: the exclusive end of the last chart day */
  toDate: Date;
  axisPoints: AxisPoint[];
}

interface StatisticSeries {
  name: string;
  data: (number | null)[];
  yAxisIndex?: number;
  lineStyle?: {
    type?: "solid" | "dashed" | "dotted";
    width?: number;
  };
}

interface StatisticYAxis {
  name?: string;
  position?: "left" | "right";
  axisLabelColor?: string;
}

export interface StatisticChartData {
  axisTimestamps: number[];
  series: StatisticSeries[];
  dateRange: {
    from: Date;
  };
  hasData: boolean;
  configuration?: ChartConfiguration;
  yAxes?: StatisticYAxis[];
}

interface ChartOptions {
  days?: number;
}

const DEFAULT_DAYS = 365;

/**
 * A chart day is the `@db.Date` value of the day: midnight UTC. UTC has no
 * daylight saving time, thus the next day is exactly 24 hours later.
 */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** The first day with statistics. The charts show no day before it. */
const FIRST_STATISTICS_DAY = toDateColumnValue({
  year: 2025,
  month: 12,
  day: 2,
});

const addDays = (day: Date, count: number) =>
  new Date(day.getTime() + count * MILLISECONDS_PER_DAY);

/** The start of a chart day in the time zone of the organization */
const getStartOfDay = (day: Date) =>
  wallTimeToInstant(
    `${getLocalDateKey(day, ORGANIZATION_TIMEZONE)}T00:00`,
    ORGANIZATION_TIMEZONE,
  );

const buildAxisPoints = (fromDay: Date, toDay: Date) => {
  const points: AxisPoint[] = [];

  for (let day = fromDay; day < toDay; day = addDays(day, 1)) {
    points.push({
      key: getLocalDateKey(day, ORGANIZATION_TIMEZONE),
      timestamp: day.getTime(),
    });
  }

  return points;
};

export const normalizeOptions = (options?: ChartOptions): NormalizedOptions => {
  const days = Math.max(options?.days ?? DEFAULT_DAYS, 7);

  const today = toDateColumnValue(
    getLocalDate(new Date(), ORGANIZATION_TIMEZONE),
  );
  const requestedFromDay = addDays(today, -(days - 1));
  const fromDay =
    requestedFromDay < FIRST_STATISTICS_DAY
      ? FIRST_STATISTICS_DAY
      : requestedFromDay;

  return {
    fromDate: getStartOfDay(fromDay),
    fromDateColumnValue: fromDay,
    toDate: getStartOfDay(today),
    axisPoints: buildAxisPoints(fromDay, today),
  } satisfies NormalizedOptions;
};

interface TotalPoint {
  createdAt: Date;
  count: number;
}

const DELTA_SERIES_NAME = "Veränderung zum Vortag";

/**
 * The shared tail of the statistic chart queries: turns an ordered
 * day-by-day total series into the chart's total line plus a dashed
 * "change vs. previous day" line on a second y-axis. The series name
 * doubles as the left axis label.
 */
export const buildTotalAndDeltaChart = (
  orderedTotals: TotalPoint[],
  options: NormalizedOptions,
  seriesId: string,
  seriesName: string,
  configuration?: ChartConfiguration,
): StatisticChartData => {
  const totalRecords = orderedTotals.map(({ createdAt, count }) => ({
    id: seriesId,
    name: seriesName,
    createdAt,
    count,
  }));

  const deltaRecords = orderedTotals.flatMap(({ createdAt, count }, index) => {
    if (index === 0) return [];

    return [
      {
        id: `${seriesId}-delta`,
        name: DELTA_SERIES_NAME,
        createdAt,
        count: count - orderedTotals[index - 1].count,
      },
    ];
  });

  const chartData = buildChartData(
    [...totalRecords, ...deltaRecords],
    options,
    configuration,
  );

  const series = chartData.series.map((serie) =>
    serie.name === DELTA_SERIES_NAME
      ? {
          ...serie,
          yAxisIndex: 1,
          lineStyle: {
            type: "dashed" as const,
            width: 1,
          },
        }
      : serie,
  );

  return {
    ...chartData,
    series,
    configuration,
    yAxes: [
      {
        name: seriesName,
        position: "left",
      },
      {
        name: "Δ Vortag",
        position: "right",
      },
    ],
  } satisfies StatisticChartData;
};

export const buildChartData = (
  records: MultiLineRecord[],
  options: NormalizedOptions,
  configuration?: ChartConfiguration,
): StatisticChartData => {
  const seriesMap = new Map<
    string,
    {
      name: string;
      values: Map<string, number>;
      lastValue: number;
      lastKey: string | null;
    }
  >();

  for (const record of records) {
    const dateKey = getLocalDateKey(record.createdAt, ORGANIZATION_TIMEZONE);
    if (!seriesMap.has(record.id)) {
      seriesMap.set(record.id, {
        name: record.name,
        values: new Map(),
        lastValue: record.count,
        lastKey: dateKey,
      });
    }

    const entry = seriesMap.get(record.id)!;
    entry.values.set(dateKey, record.count);

    if (!entry.lastKey || entry.lastKey < dateKey) {
      entry.lastKey = dateKey;
      entry.lastValue = record.count;
    }
  }

  /**
   * The name breaks ties, thus the same series stay in the top list on each
   * load, whatever order the database returns the records in.
   */
  const sortedSeries = Array.from(seriesMap.values()).toSorted(
    (a, b) => b.lastValue - a.lastValue || a.name.localeCompare(b.name),
  );

  const axisKeys = options.axisPoints.map((point) => point.key);

  let series: StatisticSeries[] = sortedSeries.map((entry) => ({
    name: entry.name,
    data: axisKeys.map((dateKey) => entry.values.get(dateKey) ?? null),
  }));
  if (configuration?.filterEmpty) {
    series = series.filter((serie) =>
      serie.data.some((value) => typeof value === "number" && value > 0),
    );
  }
  if (configuration?.top) {
    series = series.slice(0, configuration.top);
  }

  const hasData = series.some((serie) =>
    serie.data.some((value) => value !== null),
  );

  const axisTimestamps = options.axisPoints.map((point) => point.timestamp);

  return {
    axisTimestamps,
    series,
    hasData,
    dateRange: {
      from: options.fromDate,
    },
  } satisfies StatisticChartData;
};
