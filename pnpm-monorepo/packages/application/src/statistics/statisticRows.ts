import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

/**
 * The rows for the charts of the statistics page. The page builds the charts
 * from the rows (the days, the totals and the series are presentation), thus
 * these helpers give plain rows to the renderers of the app and check the
 * permission of the statistics themselves.
 */

/** A window of whole days, given as the value of a `@db.Date` column */
export interface StatisticDayWindow {
  /** The first day of the window */
  readonly fromDay: Date;
}

/** A window between two instants */
export interface StatisticInstantWindow {
  /** The start of the first day (inclusive) */
  readonly fromDate: Date;
  /** The end of the last day (exclusive) */
  readonly toDate: Date;
}

/** The number of rows before the window, and the creation times inside it */
export interface StatisticCreationRows<CreatedAt> {
  readonly baselineCount: number;
  readonly createdAts: CreatedAt[];
}

export interface DailyLoginCountRow {
  readonly date: Date;
  readonly count: number;
}

export interface DailyMcpUsageCountRow {
  readonly day: Date;
  readonly count: number;
}

export interface PositiveSilcTransactionRow {
  readonly createdAt: Date;
  readonly value: number;
}

export interface RoleCitizenCountRow {
  readonly roleId: string;
  readonly roleName: string;
  readonly day: Date;
  readonly count: number;
}

export interface TotalShipCountRow {
  readonly day: Date;
  readonly count: number;
}

export interface VariantShipCountRow {
  readonly variantId: string;
  readonly variantName: string;
  readonly day: Date;
  readonly count: number;
}

/**
 * The login counts of the window, with the last day before it. The change of
 * the first day of the chart compares with that day.
 */
export const findDailyLoginCountRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDay }: StatisticDayWindow,
): Promise<DailyLoginCountRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const previousDay = await context.prisma.dailyLoginCount.findFirst({
    where: { date: { lt: fromDay } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  return context.prisma.dailyLoginCount.findMany({
    where: { date: { gte: previousDay?.date ?? fromDay } },
    orderBy: { date: "asc" },
    select: { date: true, count: true },
  });
};

/**
 * The MCP usage counts of the window, with the last day before it. The change
 * of the first day of the chart compares with that day.
 */
export const findDailyMcpUsageCountRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDay }: StatisticDayWindow,
): Promise<DailyMcpUsageCountRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const previousDay = await context.prisma.dailyMcpUsageCount.findFirst({
    where: { day: { lt: fromDay } },
    orderBy: { day: "desc" },
    select: { day: true },
  });

  return context.prisma.dailyMcpUsageCount.findMany({
    where: { day: { gte: previousDay?.day ?? fromDay } },
    orderBy: { day: "asc" },
    select: { day: true, count: true },
  });
};

/** The transactions with a positive value inside the window */
export const findPositiveSilcTransactionRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDate, toDate }: StatisticInstantWindow,
): Promise<PositiveSilcTransactionRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  return context.prisma.silcTransaction.findMany({
    where: {
      deletedAt: null,
      value: { gt: 0 },
      createdAt: { gte: fromDate, lt: toDate },
    },
    select: { createdAt: true, value: true },
    orderBy: { createdAt: "asc" },
  });
};

/** The start times of the events that start inside the window */
export const findEventStartTimes = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDate, toDate }: StatisticInstantWindow,
): Promise<Date[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const events = await context.prisma.event.findMany({
    where: { startTime: { gte: fromDate, lt: toDate } },
    select: { startTime: true },
  });

  return events.map((event) => event.startTime);
};

/** A user can lack a creation time: the row then counts for no day */
export const findUserRegistrationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDate, toDate }: StatisticInstantWindow,
): Promise<StatisticCreationRows<Date | null>> => {
  requirePermission(actor, "globalStatistics", "read");

  const [baselineCount, registrations] = await Promise.all([
    context.prisma.user.count({ where: { createdAt: { lt: fromDate } } }),
    context.prisma.user.findMany({
      where: { createdAt: { gte: fromDate, lt: toDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    baselineCount,
    createdAts: registrations.map((registration) => registration.createdAt),
  };
};

/** The number of citizens of each role and day since the first day */
export const findRoleCitizenCountRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDay }: StatisticDayWindow,
): Promise<RoleCitizenCountRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const rows = await context.prisma.roleCitizenCount.findMany({
    where: { day: { gte: fromDay } },
    select: {
      roleId: true,
      day: true,
      count: true,
      role: { select: { name: true } },
    },
    orderBy: { day: "asc" },
  });

  return rows.map((row) => ({
    roleId: row.roleId,
    roleName: row.role.name,
    day: row.day,
    count: row.count,
  }));
};

/** The creation times of the active citizens inside the window */
export const findCitizenCreationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDate, toDate }: StatisticInstantWindow,
): Promise<StatisticCreationRows<Date>> => {
  requirePermission(actor, "globalStatistics", "read");

  const [baselineCount, citizens] = await Promise.all([
    context.prisma.citizen.count({
      where: { ...ACTIVE_CITIZEN_WHERE, createdAt: { lt: fromDate } },
    }),
    context.prisma.citizen.findMany({
      where: {
        ...ACTIVE_CITIZEN_WHERE,
        createdAt: { gte: fromDate, lt: toDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    baselineCount,
    createdAts: citizens.map((citizen) => citizen.createdAt),
  };
};

/** The creation times of the organizations inside the window */
export const findOrganizationCreationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDate, toDate }: StatisticInstantWindow,
): Promise<StatisticCreationRows<Date>> => {
  requirePermission(actor, "globalStatistics", "read");

  const [baselineCount, organizations] = await Promise.all([
    context.prisma.organization.count({
      where: { createdAt: { lt: fromDate } },
    }),
    context.prisma.organization.findMany({
      where: { createdAt: { gte: fromDate, lt: toDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    baselineCount,
    createdAts: organizations.map((organization) => organization.createdAt),
  };
};

/**
 * The total number of ships of each day of the window, with the last day
 * before it. The change of the first day of the chart compares with that day.
 */
export const findTotalShipCountRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDay }: StatisticDayWindow,
): Promise<TotalShipCountRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const previousDay = await context.prisma.variantShipCount.findFirst({
    where: { day: { lt: fromDay } },
    orderBy: { day: "desc" },
    select: { day: true },
  });

  const rows = await context.prisma.variantShipCount.groupBy({
    by: ["day"],
    where: { day: { gte: previousDay?.day ?? fromDay } },
    _sum: { count: true },
    orderBy: { day: "asc" },
  });

  return rows.map((row) => ({ day: row.day, count: row._sum.count ?? 0 }));
};

/** The number of ships of each variant and day since the first day */
export const findVariantShipCountRows = async (
  context: ApplicationContext,
  actor: Actor,
  { fromDay }: StatisticDayWindow,
): Promise<VariantShipCountRow[]> => {
  requirePermission(actor, "globalStatistics", "read");

  const rows = await context.prisma.variantShipCount.findMany({
    where: { day: { gte: fromDay } },
    select: {
      variantId: true,
      day: true,
      count: true,
      variant: { select: { name: true } },
    },
    orderBy: { day: "asc" },
  });

  return rows.map((row) => ({
    variantId: row.variantId,
    variantName: row.variant.name,
    day: row.day,
    count: row.count,
  }));
};
