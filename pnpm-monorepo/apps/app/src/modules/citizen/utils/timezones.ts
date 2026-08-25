/**
 * The IANA time zone names a citizen can choose. The list is an allowlist:
 * only a name from it may reach the database and later
 * `Intl.DateTimeFormat`.
 */

/** "America/Argentina/ComodRivadavia" is 32 characters; this leaves room. */
export const TIMEZONE_MAX_LENGTH = 64;

/**
 * `Intl.supportedValuesOf` reports only the zones with an area prefix, thus
 * UTC is added. Every runtime accepts it.
 */
export const SUPPORTED_TIMEZONES = [
  "UTC",
  ...Intl.supportedValuesOf("timeZone"),
];

const supportedTimezones = new Set<string>(SUPPORTED_TIMEZONES);

export const isSupportedTimezone = (value: string) =>
  supportedTimezones.has(value);
