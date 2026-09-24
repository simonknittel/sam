/**
 * Star Citizen plays 930 years ahead of the real calendar, thus the night
 * from December 31, 2026 to January 1, 2027 starts the year 2957 in the
 * game. The New Year greeting of the Lambda and the New Year banner of the
 * app both name that year and never the real one, thus the offset lives
 * here.
 */
const IN_GAME_YEAR_OFFSET = 930;

/** The in-game year of a calendar year */
export const getInGameYear = (calendarYear: number) =>
  calendarYear + IN_GAME_YEAR_OFFSET;
