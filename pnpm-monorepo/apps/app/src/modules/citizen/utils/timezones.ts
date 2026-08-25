/**
 * The IANA time zone names the runtime knows. The list is an allowlist: only
 * a name from it may reach the database and later `Intl.DateTimeFormat`.
 */

/** "America/Argentina/ComodRivadavia" is 32 characters; this leaves room. */
export const TIMEZONE_MAX_LENGTH = 64;

export const getSupportedTimezones = () => Intl.supportedValuesOf("timeZone");

const supportedTimezones = new Set<string>(getSupportedTimezones());

export const isSupportedTimezone = (value: string) =>
  supportedTimezones.has(value);
