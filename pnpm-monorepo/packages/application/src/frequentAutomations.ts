import {
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toLocalDateKey,
  wallTimeToInstant,
  type LocalDate,
} from "@sam-monorepo/domain";

/**
 * The interval of the schedule of the `frequent-automations` Lambda function
 * (`schedule_expression` in `terraform/frequent-automations.tf`). The jobs of
 * the function calculate their windows with it, thus change the two values
 * together.
 */
export const FREQUENT_AUTOMATIONS_INTERVAL_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export const FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS =
  FREQUENT_AUTOMATIONS_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE;

export interface RunWindow {
  readonly gte: Date;
  readonly lt: Date;
}

/**
 * The windows of two runs one interval apart touch, thus each instant is in
 * the window of exactly one run. But `now` is the real start of the run, not the
 * scheduled one: with different start delays, an instant can be in no window or
 * in two.
 */
export const getRunWindow = (
  now: Date,
  offsetMilliseconds: number,
): RunWindow => {
  const start = now.getTime() + offsetMilliseconds;

  return {
    gte: new Date(start),
    lt: new Date(start + FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS),
  };
};

/**
 * The instant of a wall time ("HH:mm") on a calendar date in the time zone
 * of the organization
 */
export const getOrganizationInstant = (
  date: LocalDate,
  wallTime: string,
): Date =>
  wallTimeToInstant(
    `${toLocalDateKey(date)}T${wallTime}`,
    ORGANIZATION_TIMEZONE,
  );

/**
 * True only for the first run at or after the wall time ("HH:mm") of today in
 * the time zone of the organization
 */
export const isFirstRunAfterWallTime = (
  now: Date,
  wallTime: string,
): boolean => {
  const millisecondsSinceWallTime =
    now.getTime() -
    getOrganizationInstant(
      getLocalDate(now, ORGANIZATION_TIMEZONE),
      wallTime,
    ).getTime();

  return (
    millisecondsSinceWallTime >= 0 &&
    millisecondsSinceWallTime < FREQUENT_AUTOMATIONS_INTERVAL_MILLISECONDS
  );
};
