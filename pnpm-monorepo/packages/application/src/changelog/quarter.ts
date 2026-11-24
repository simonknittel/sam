export enum Quarter {
  First = "q1",
  Second = "q2",
  Third = "q3",
  Fourth = "q4",
}

export interface ChangelogQuarter {
  /** For example `2026-q3` */
  readonly slug: string;
  readonly year: string;
  readonly quarter: Quarter;
}

export const CHANGELOG_QUARTER_SLUG_PATTERN = /^\d{4}-q[1-4]$/;

const QUARTERS_IN_ORDER = [
  Quarter.First,
  Quarter.Second,
  Quarter.Third,
  Quarter.Fourth,
];

const MONTHS_PER_QUARTER = 12 / QUARTERS_IN_ORDER.length;

/** @param date `YYYY-MM-DD` */
export const getQuarterOfDate = (date: string): ChangelogQuarter => {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));

  const quarter =
    QUARTERS_IN_ORDER[Math.floor((month - 1) / MONTHS_PER_QUARTER)];
  if (!quarter) throw new Error(`Invalid changelog date: ${date}`);

  return {
    slug: `${year}-${quarter}`,
    year,
    quarter,
  };
};
