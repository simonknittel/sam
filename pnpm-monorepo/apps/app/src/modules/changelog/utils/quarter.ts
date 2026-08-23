export enum Quarter {
  First = "q1",
  Second = "q2",
  Third = "q3",
  Fourth = "q4",
}

export interface ChangelogQuarter {
  /**
   * The identifier of the quarter in the URL, for example `2026-q3`.
   */
  readonly slug: string;
  readonly year: string;
  readonly quarter: Quarter;
}

const QUARTERS_IN_ORDER = [
  Quarter.First,
  Quarter.Second,
  Quarter.Third,
  Quarter.Fourth,
];

const MONTHS_PER_QUARTER = 12 / QUARTERS_IN_ORDER.length;

/**
 * @param date A date in the `YYYY-MM-DD` format.
 */
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

export const formatQuarterLabel = (quarter: Quarter) => quarter.toUpperCase();
