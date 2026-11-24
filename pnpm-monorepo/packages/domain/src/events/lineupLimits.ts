/**
 * The page shows four levels, and the position tree of the use cases loads four
 * levels, thus a deeper position would disappear from the page.
 */
export const LINEUP_MAX_DEPTH = 4;

/** The most positions with the same parent (or on the top level) */
export const LINEUP_MAX_POSITIONS_PER_LEVEL = 50;

/** A new order writes one row for each position in one transaction. */
export const LINEUP_MAX_POSITIONS = 500;

export const MAXIMUM_POSITION_NAME_LENGTH = 256;
export const MAXIMUM_POSITION_DESCRIPTION_LENGTH = 512;
