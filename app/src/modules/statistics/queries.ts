import { prisma } from "@/db";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { requireAuthentication } from "../auth/server";
import { withTrace } from "../tracing/utils/withTrace";

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
}

export interface StatisticChartData {
  axisTimestamps: number[];
  series: StatisticSeries[];
  lastUpdatedAt: Date | null;
  totalSeries: number;
  includedSeries: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  hasData: boolean;
}

interface ChartOptions {
  days?: number;
  seriesLimit?: number;
}

const DEFAULT_DAYS = 365;
const MIN_AXIS_DATE = startOfDay(new Date("2025-12-03"));

const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");

const buildAxisPoints = (fromDate: Date, toDate: Date) => {
  const points: AxisPoint[] = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    points.push({
      key: formatDateKey(cursor),
      timestamp: cursor.getTime(),
    });

    cursor = addDays(cursor, 1);
  }

  return points;
};

const normalizeOptions = (options?: ChartOptions): NormalizedOptions => {
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

const buildChartData = (records: MultiLineRecord[]): StatisticChartData => {
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

  const series: StatisticSeries[] = limitedSeries
    .map((entry) => ({
      name: entry.name,
      data: axisKeys.map((dateKey) => entry.values.get(dateKey) ?? null),
    }))
    .filter((serie) =>
      serie.data.some((value) => typeof value === "number" && value > 0),
    );

  const hasData = series.some((serie) =>
    serie.data.some((value) => value !== null),
  );

  const axisTimestamps = options.axisPoints.map((point) => point.timestamp);

  const lastRecord = records[records.length - 1];

  return {
    axisTimestamps,
    series,
    hasData,
    lastUpdatedAt: lastRecord ? lastRecord.createdAt : null,
    totalSeries: allSeries.length,
    includedSeries: series.length,
    dateRange: {
      from: options.fromDate,
      to: options.toDate,
    },
  } satisfies StatisticChartData;
};

export const getRoleCitizenStatisticChart = cache(
  withTrace("getRoleCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.roleCitizenCount.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const records: MultiLineRecord[] = rows.map((row) => ({
      id: row.roleId,
      name: row.role.name,
      createdAt: row.createdAt,
      count: row.count,
    }));

    return buildChartData(records);
  }),
);

export const getVariantShipStatisticChart = cache(
  withTrace("getVariantShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.variantShipCount.findMany({
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            series: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const records: MultiLineRecord[] = rows.map((row) => ({
      id: row.variantId,
      name: row.variant.name,
      createdAt: row.createdAt,
      count: row.count,
    }));

    return buildChartData(records);
  }),
);

export const getDailyLoginStatisticChart = cache(
  withTrace("getDailyLoginStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.dailyLoginCount.findMany({
      orderBy: {
        date: "asc",
      },
    });

    const records: MultiLineRecord[] = rows.map((row) => ({
      id: "logins",
      name: "Logins",
      createdAt: row.date,
      count: row.count,
    }));

    return buildChartData(records);
  }),
);

export const getEventsPerDayStatisticChart = cache(
  withTrace("getEventsPerDayStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const options = normalizeOptions();

    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: options.fromDate,
          lt: options.toDateExclusive,
        },
      },
      select: {
        startTime: true,
      },
    });

    const countsByDate = new Map<string, { date: Date; count: number }>();
    for (const event of events) {
      const dayStart = startOfDay(event.startTime);
      const dateKey = formatDateKey(dayStart);
      const existing = countsByDate.get(dateKey);
      if (existing) {
        existing.count += 1;
      } else {
        countsByDate.set(dateKey, { date: dayStart, count: 1 });
      }
    }

    const records: MultiLineRecord[] = Array.from(countsByDate.values()).map(
      ({ date, count }) => ({
        id: "events",
        name: "Events",
        createdAt: date,
        count,
      }),
    );

    records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return buildChartData(records);
  }),
);
