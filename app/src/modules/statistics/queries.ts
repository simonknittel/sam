import { prisma } from "@/db";
import { addDays, startOfDay, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { requireAuthentication } from "../auth/server";
import { withTrace } from "../tracing/utils/withTrace";

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

const buildChartData = (
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

export const getRoleCitizenStatisticChart = cache(
  withTrace("getRoleCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {
      top: 15,
      filterEmpty: true,
    };

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

    const records: MultiLineRecord[] = rows.map((row) => {
      const createdAt = new Date(row.createdAt);
      createdAt.setDate(createdAt.getDate() - 1); // Workaround: Offset due to timezone

      return {
        id: row.roleId,
        name: row.role.name,
        createdAt,
        count: row.count,
      };
    });

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);

export const getVariantShipStatisticChart = cache(
  withTrace("getVariantShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {
      top: 15,
      filterEmpty: true,
    };

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

    const records: MultiLineRecord[] = rows.map((row) => {
      const createdAt = new Date(row.createdAt);
      createdAt.setDate(createdAt.getDate() - 1); // Workaround: Offset due to timezone

      return {
        id: row.variantId,
        name: row.variant.name,
        createdAt,
        count: row.count,
      };
    });

    return {
      ...buildChartData(records, configuration),
      configuration,
    };
  }),
);

export const getTotalShipStatisticChart = cache(
  withTrace("getTotalShipStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const rows = await prisma.variantShipCount.findMany({
      select: {
        createdAt: true,
        count: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalsByDate = new Map<
      string,
      {
        createdAt: Date;
        count: number;
      }
    >();

    for (const row of rows) {
      const createdAt = new Date(row.createdAt);
      createdAt.setDate(createdAt.getDate() - 1); // Workaround: Offset due to timezone

      const key = formatDateKey(createdAt);
      const existing = totalsByDate.get(key);

      if (existing) {
        existing.count += row.count;
      } else {
        totalsByDate.set(key, {
          createdAt,
          count: row.count,
        });
      }
    }

    const orderedTotals = Array.from(totalsByDate.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const configuration: ChartConfiguration = {};

    const totalRecords: MultiLineRecord[] = orderedTotals.map(
      ({ createdAt, count }) => ({
        id: "total-ships",
        name: "Gesamt",
        createdAt,
        count,
      }),
    );

    const deltaRecords: MultiLineRecord[] = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "total-ships-delta",
            name: "Veränderung zum Vortag",
            createdAt,
            count: count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Gesamt",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getTotalCitizenStatisticChart = cache(
  withTrace("getTotalCitizenStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};
    const options = normalizeOptions();

    const [baselineCount, citizens] = await Promise.all([
      prisma.entity.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.entity.findMany({
        where: {
          createdAt: {
            gte: options.fromDate,
            lt: options.toDateExclusive,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    const citizensByDate = new Map<string, number>();
    for (const citizen of citizens) {
      const dateKey = formatDateKey(citizen.createdAt);
      citizensByDate.set(dateKey, (citizensByDate.get(dateKey) ?? 0) + 1);
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = citizensByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      } satisfies {
        createdAt: Date;
        count: number;
      };
    });

    const totalRecords: MultiLineRecord[] = orderedTotals.map(
      ({ createdAt, count }) => ({
        id: "citizens",
        name: "Citizens",
        createdAt,
        count,
      }),
    );

    const deltaRecords: MultiLineRecord[] = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "citizens-delta",
            name: "Veränderung zum Vortag",
            createdAt,
            count: count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Citizens",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getTotalOrganizationStatisticChart = cache(
  withTrace("getTotalOrganizationStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};
    const options = normalizeOptions();

    const [baselineCount, organizations] = await Promise.all([
      prisma.organization.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.organization.findMany({
        where: {
          createdAt: {
            gte: options.fromDate,
            lt: options.toDateExclusive,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    const organizationsByDate = new Map<string, number>();
    for (const organization of organizations) {
      const dateKey = formatDateKey(organization.createdAt);
      organizationsByDate.set(
        dateKey,
        (organizationsByDate.get(dateKey) ?? 0) + 1,
      );
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = organizationsByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      } satisfies {
        createdAt: Date;
        count: number;
      };
    });

    const totalRecords: MultiLineRecord[] = orderedTotals.map(
      ({ createdAt, count }) => ({
        id: "organizations",
        name: "Organisationen",
        createdAt,
        count,
      }),
    );

    const deltaRecords: MultiLineRecord[] = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "organizations-delta",
            name: "Veränderung zum Vortag",
            createdAt,
            count: count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Organisationen",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getRegisteredUserStatisticChart = cache(
  withTrace("getRegisteredUserStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};
    const options = normalizeOptions();

    const [baselineCount, registrations] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            lt: options.fromDate,
          },
        },
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: options.fromDate,
            lt: options.toDateExclusive,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    const registrationsByDate = new Map<string, number>();
    for (const registration of registrations) {
      if (!registration.createdAt) continue;

      const dateKey = formatDateKey(registration.createdAt);
      registrationsByDate.set(
        dateKey,
        (registrationsByDate.get(dateKey) ?? 0) + 1,
      );
    }

    let runningTotal = baselineCount;
    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const delta = registrationsByDate.get(key) ?? 0;
      runningTotal += delta;

      return {
        createdAt: new Date(timestamp),
        count: runningTotal,
      } satisfies {
        createdAt: Date;
        count: number;
      };
    });

    const totalRecords: MultiLineRecord[] = orderedTotals.map(
      ({ createdAt, count }) => ({
        id: "registered-users",
        name: "Registrierte Benutzer",
        createdAt,
        count,
      }),
    );

    const deltaRecords: MultiLineRecord[] = orderedTotals.flatMap(
      ({ createdAt, count }, index) => {
        if (index === 0) return [];

        return [
          {
            id: "registered-users-delta",
            name: "Veränderung zum Vortag",
            createdAt,
            count: count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Registrierte Benutzer",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getDailyLoginStatisticChart = cache(
  withTrace("getDailyLoginStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};

    const rows = await prisma.dailyLoginCount.findMany({
      orderBy: {
        date: "asc",
      },
    });

    const orderedLogins = rows.map((row) => {
      const createdAt = new Date(row.date);
      createdAt.setDate(createdAt.getDate() + 1); // Workaround: Offset due to timezone

      return {
        createdAt,
        count: row.count,
      };
    });

    const totalRecords: MultiLineRecord[] = orderedLogins.map((entry) => ({
      id: "logins",
      name: "Logins",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords: MultiLineRecord[] = orderedLogins.flatMap(
      (entry, index) => {
        if (index === 0) return [];

        return [
          {
            id: "logins-delta",
            name: "Veränderung zum Vortag",
            createdAt: entry.createdAt,
            count: entry.count - orderedLogins[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Logins",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getEventsPerDayStatisticChart = cache(
  withTrace("getEventsPerDayStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};
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

    const countsByDate = new Map<string, number>();
    for (const event of events) {
      const dayStart = startOfDay(event.startTime);
      const dateKey = formatDateKey(dayStart);
      const existing = countsByDate.get(dateKey) ?? 0;
      countsByDate.set(dateKey, existing + 1);
    }

    const orderedEvents = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: countsByDate.get(key) ?? 0,
      };
    });

    const totalRecords: MultiLineRecord[] = orderedEvents.map((entry) => ({
      id: "events",
      name: "Events",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords: MultiLineRecord[] = orderedEvents.flatMap(
      (entry, index) => {
        if (index === 0) return [];

        return [
          {
            id: "events-delta",
            name: "Veränderung zum Vortag",
            createdAt: entry.createdAt,
            count: entry.count - orderedEvents[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "Events",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);

export const getDailySilcStatisticChart = cache(
  withTrace("getDailySilcStatisticChart", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("globalStatistics", "read")))
      forbidden();

    const configuration: ChartConfiguration = {};
    const options = normalizeOptions();

    const transactions = await prisma.silcTransaction.findMany({
      where: {
        deletedAt: null,
        value: {
          gt: 0,
        },
        createdAt: {
          gte: options.fromDate,
          lt: options.toDateExclusive,
        },
      },
      select: {
        createdAt: true,
        value: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalsByDate = new Map<string, number>();

    for (const transaction of transactions) {
      const createdAt = startOfDay(transaction.createdAt);
      const key = formatDateKey(createdAt);
      const current = totalsByDate.get(key) ?? 0;
      totalsByDate.set(key, current + transaction.value);
    }

    const orderedTotals = options.axisPoints.map(({ key, timestamp }) => {
      const createdAt = new Date(timestamp);

      return {
        createdAt,
        count: totalsByDate.get(key) ?? 0,
      };
    });

    const totalRecords: MultiLineRecord[] = orderedTotals.map((entry) => ({
      id: "silc",
      name: "SILC",
      createdAt: entry.createdAt,
      count: entry.count,
    }));

    const deltaRecords: MultiLineRecord[] = orderedTotals.flatMap(
      (entry, index) => {
        if (index === 0) return [];

        return [
          {
            id: "silc-delta",
            name: "Veränderung zum Vortag",
            createdAt: entry.createdAt,
            count: entry.count - orderedTotals[index - 1].count,
          },
        ];
      },
    );

    const chartData = buildChartData(
      [...totalRecords, ...deltaRecords],
      configuration,
    );

    const series = chartData.series.map((serie) =>
      serie.name === "Veränderung zum Vortag"
        ? {
          ...serie,
          yAxisIndex: 1,
        }
        : serie,
    );

    return {
      ...chartData,
      series,
      configuration,
      yAxes: [
        {
          name: "SILC",
          position: "left",
        },
        {
          name: "Δ Vortag",
          position: "right",
        },
      ],
    } satisfies StatisticChartData;
  }),
);
