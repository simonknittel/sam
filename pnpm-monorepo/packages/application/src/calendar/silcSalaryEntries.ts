import {
  CalendarEntryType,
  compareLocalDates,
  fromDateColumnValue,
  getLocalDate,
  getSalaryDueDaysInRange,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  toLocalDateKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { isRoleVisible } from "../roles/roleVisibility.js";
import { getPaidAssignments, SALARY_ROLE_SELECT } from "../silc/salaryRules.js";
import type {
  CalendarEntryCollector,
  SilcSalaryCalendarEntry,
} from "./calendarEntry.js";

/** The salaries of one day */
interface SalaryDay {
  readonly date: LocalDate;
  value: number;
  readonly roleNames: Set<string>;
}

interface SalaryRole {
  readonly id: string;
  readonly name: string;
}

/**
 * The name of a role is only for the actors who can see the role (see
 * `isRoleVisible`). The app hides the own hidden roles too, thus a salary of
 * such a role adds its value without its name.
 */
const getVisibleRoleName = (actor: Actor, role: SalaryRole | null) =>
  role && isRoleVisible(actor, role.id) ? role.name : null;

const addToSalaryDay = (
  salaryDays: Map<string, SalaryDay>,
  date: LocalDate,
  value: number,
  roleName: string | null,
) => {
  const key = toLocalDateKey(date);
  const salaryDay = salaryDays.get(key) ?? {
    date,
    value: 0,
    roleNames: new Set<string>(),
  };

  salaryDay.value += value;
  if (roleName) salaryDay.roleNames.add(roleName);
  salaryDays.set(key, salaryDay);
};

/**
 * The roles that pay a salary to the citizen, with the rule of the salary
 * job (see `getPaidAssignments`): the assignments are only the ones of the
 * citizen
 */
const findPaidSalaryRoles = async (
  context: ApplicationContext,
  citizenId: string,
) => {
  const roles = await context.prisma.role.findMany({
    where: {
      assignments: { some: { citizenId } },
      silcSalaries: { some: {} },
    },
    select: {
      ...SALARY_ROLE_SELECT,
      assignments: {
        ...SALARY_ROLE_SELECT.assignments,
        where: { AND: [SALARY_ROLE_SELECT.assignments.where, { citizenId }] },
      },
      silcSalaries: { select: { value: true, dayOfMonth: true } },
    },
  });

  return roles.filter((role) => getPaidAssignments(role).length > 0);
};

const toEntries = (
  salaryDays: Map<string, SalaryDay>,
  isForecast: boolean,
  href: string | null,
): SilcSalaryCalendarEntry[] =>
  [...salaryDays].map(([key, salaryDay]) => ({
    type: CalendarEntryType.SilcSalary,
    key: `silc_salary:${key}`,
    date: salaryDay.date,
    time: null,
    href,
    value: salaryDay.value,
    roleNames: [...salaryDay.roleNames].toSorted((first, second) =>
      first.localeCompare(second, "de"),
    ),
    isForecast,
  }));

/**
 * The salaries of the citizen of the actor, one entry for each day. The days
 * before today (in the time zone of the organization) show the bookings of
 * the salary job. From today on, a day shows its bookings when it has some,
 * and else the salaries that the current roles of the citizen will pay.
 */
export const silcSalaryEntryCollector: CalendarEntryCollector<SilcSalaryCalendarEntry> =
  {
    canRead: (actor) =>
      actor.citizen !== null &&
      actor.authorize("silcBalanceOfCurrentCitizen", "read"),
    collect: async (context, actor, { range }) => {
      const citizenId = requireCitizen(actor).id;
      const today = getLocalDate(context.now(), ORGANIZATION_TIMEZONE);
      const forecastStart =
        compareLocalDates(range.start, today) > 0 ? range.start : today;
      const hasForecast = compareLocalDates(range.end, forecastStart) >= 0;

      const [bookings, roles] = await Promise.all([
        context.prisma.silcTransaction.findMany({
          where: {
            receiverId: citizenId,
            deletedAt: null,
            salaryDate: {
              gte: toDateColumnValue(range.start),
              lte: toDateColumnValue(range.end),
            },
          },
          select: {
            value: true,
            salaryDate: true,
            salaryRole: { select: { id: true, name: true } },
          },
        }),
        hasForecast ? findPaidSalaryRoles(context, citizenId) : [],
      ]);

      const bookedDays = new Map<string, SalaryDay>();
      for (const booking of bookings) {
        if (!booking.salaryDate) continue;

        addToSalaryDay(
          bookedDays,
          fromDateColumnValue(booking.salaryDate),
          booking.value,
          getVisibleRoleName(actor, booking.salaryRole),
        );
      }

      const forecastDays = new Map<string, SalaryDay>();
      for (const role of roles) {
        const roleName = getVisibleRoleName(actor, role);

        for (const salary of role.silcSalaries) {
          const dueDays = getSalaryDueDaysInRange(salary.dayOfMonth, {
            start: forecastStart,
            end: range.end,
          });

          for (const date of dueDays) {
            if (bookedDays.has(toLocalDateKey(date))) continue;

            addToSalaryDay(forecastDays, date, salary.value, roleName);
          }
        }
      }

      /** The SILC tab of the own citizen lists the bookings */
      const href =
        actor.authorize("citizen", "read") &&
        actor.authorize("silcTransactionOfCurrentCitizen", "read")
          ? `/app/spynet/citizen/${citizenId}/silc`
          : null;

      return [
        ...toEntries(bookedDays, false, href),
        ...toEntries(forecastDays, true, href),
      ];
    },
  };
