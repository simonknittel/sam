/**
 * The name of the time zone at the given date. The name changes with daylight
 * saving time.
 *
 * @returns Example: "Central European Summer Time (CEST)"
 */
export const getActiveTimeZoneName = (timeZone: string, date: Date) => {
  const getShortTimeZoneName = (locale: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;

  const longName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "long",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const enUsShortName = getShortTimeZoneName("en-US");
  const shortName = enUsShortName?.startsWith("GMT")
    ? (getShortTimeZoneName("en-GB") ?? enUsShortName)
    : enUsShortName;

  if (!longName) {
    return shortName;
  }

  if (!shortName || shortName === longName) {
    return longName;
  }

  return `${longName} (${shortName})`;
};
