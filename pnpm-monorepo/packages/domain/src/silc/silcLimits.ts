/**
 * The limits of the SILC transactions. The forms of the app and the use
 * cases use the same values.
 */

/**
 * The longest description of a SILC transaction. The column has no limit.
 * The limit keeps the input bounded.
 */
export const SILC_DESCRIPTION_MAXIMUM_LENGTH = 512;

/**
 * The largest SILC value of a manual booking, a task reward and a role
 * salary. Each receiver gets a booking of the value. This stays in the 32-bit
 * integer range of the value and balance columns (2,147,483,647).
 */
export const SILC_VALUE_MAXIMUM = 1_000_000;
