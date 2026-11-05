interface DateRangePreset {
  readonly label: string;
  readonly from: string;
  readonly to: string;
}

/** The lengths of the presets which end today */
const LAST_DAYS_PRESETS = [7, 30, 90];

/**
 * `YYYY-MM-DD`. `Date.UTC` moves a day or a month outside its range into the
 * month or the year next to it: day 0 is the last day of the month before.
 */
const toDay = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/**
 * The presets of the date range. They work on calendar days, because the days
 * around a daylight saving change are 23 and 25 hours long.
 *
 * @param today `YYYY-MM-DD`
 * @param oldestLogDay `YYYY-MM-DD`, or null when no file name has a date
 */
export const getDateRangePresets = (
  today: string,
  oldestLogDay: string | null,
): DateRangePreset[] => {
  const [year, month, day] = today.split("-").map(Number);
  const monthIndex = month - 1;

  return [
    ...LAST_DAYS_PRESETS.map((dayCount) => ({
      label: `Letzte ${dayCount} Tage`,
      from: toDay(year, monthIndex, day - dayCount + 1),
      to: today,
    })),
    { label: "Dieser Monat", from: toDay(year, monthIndex, 1), to: today },
    {
      label: "Letzter Monat",
      from: toDay(year, monthIndex - 1, 1),
      to: toDay(year, monthIndex, 0),
    },
    { label: "Dieses Jahr", from: toDay(year, 0, 1), to: today },
    {
      label: "Letztes Jahr",
      from: toDay(year - 1, 0, 1),
      to: toDay(year, 0, 0),
    },
    ...(oldestLogDay
      ? [{ label: "Alle Logs", from: oldestLogDay, to: today }]
      : []),
  ];
};
