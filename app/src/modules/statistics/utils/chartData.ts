import { addDays, startOfDay, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

interface ChartConfiguration {
  readonly top?: number;
  readonly filterEmpty?: boolean;
}

interface MultiLineRecord {
  id: string;
  name: string;
  createdAt: Date;
  count: number;
}

interface AxisPoint {
  key: string;
  timestamp: number;
}

interface NormalizedOptions {
  fromDate: Date;
  toDate: Date;
  toDateExclusive: Date;
  axisPoints: AxisPoint[];
}

export interface StatisticSeries {
  name: string;
  data: (number | null)[];
  yAxisIndex?: number;
  lineStyle?: {
    type?: "solid" | "dashed" | "dotted";
    width?: number;
  };
}

export interface StatisticYAxis {
  name?: string;
  position?: "left" | "right";
  axisLabelColor?: string;
}

export interface StatisticChartData {
  axisTimestamps: number[];
  series: StatisticSeries[];
  dateRange: {
    from: Date;
    to: Date;
  };
  hasData: boolean;
  configuration?: ChartConfiguration;
  yAxes?: StatisticYAxis[];
}

interface ChartOptions {
  days?: number;
  seriesLimit?: number;
}

const DEFAULT_DAYS = 365;
const MIN_AXIS_DATE = startOfDay(new Date("2025-12-02"));

const formatDateKey = (date: Date) =>
  formatInTimeZone(date, "Europe/Berlin", "yyyy-MM-dd");

const buildAxisPoints = (fromDate: Date, toDate: Date) => {
  const points: AxisPoint[] = [];
  let cursor = fromDate;

  while (cursor < toDate) {
    points.push({
      key: formatDateKey(cursor),
      timestamp: cursor.getTime(),
    });

    cursor = addDays(cursor, 1);
  }

  return points;
};

export const normalizeOptions = (options?: ChartOptions): NormalizedOptions => {
  const days = Math.max(options?.days ?? DEFAULT_DAYS, 7);

  const toDate = startOfDay(new Date());
  const requestedFromDate = subDays(toDate, days - 1);
  const fromDate =
    requestedFromDate < MIN_AXIS_DATE ? MIN_AXIS_DATE : requestedFromDate;

  return {
    fromDate,
    toDate,
    toDateExclusive: addDays(toDate, 1),
    axisPoints: buildAxisPoints(fromDate, toDate),
  } satisfies NormalizedOptions;
};

export const buildChartData = (
  records: MultiLineRecord[],
  configuration?: ChartConfiguration,
): StatisticChartData => {
  const options = normalizeOptions();

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
    const dateKey = formatDateKey(record.createdAt);
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

  const allSeries = Array.from(seriesMap.values());

  const limitedSeries = allSeries.sort((a, b) => b.lastValue - a.lastValue);

  const axisKeys = options.axisPoints.map((point) => point.key);

  let series: StatisticSeries[] = limitedSeries.map((entry) => ({
    name: entry.name,
    data: axisKeys.map((dateKey) => entry.values.get(dateKey) ?? null),
  }));
  if (configuration?.filterEmpty) {
    series = series.filter((serie) =>
      serie.data.some((value) => typeof value === "number" && value > 0),
    );
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
      to: options.toDate,
    },
  } satisfies StatisticChartData;
};
