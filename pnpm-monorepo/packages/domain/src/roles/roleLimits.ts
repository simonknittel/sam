/** A role name is much shorter. The limit keeps the input bounded. */
export const ROLE_NAME_MAXIMUM_LENGTH = 255;

export const ROLE_DESCRIPTION_MAXIMUM_LENGTH = 2048;

/**
 * The days of inactivity after which a citizen loses or gets a role. The
 * maximum is about 27 years: far above a real period of inactivity.
 */
export const ROLE_INACTIVITY_DAYS_MINIMUM = 1;
export const ROLE_INACTIVITY_DAYS_MAXIMUM = 10_000;

/** The popover of a role badge shows one segment for each level. */
export const ROLE_LEVEL_MINIMUM = 1;
export const ROLE_LEVEL_MAXIMUM = 100;
