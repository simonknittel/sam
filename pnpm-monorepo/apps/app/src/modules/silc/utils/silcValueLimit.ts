/**
 * The largest SILC value of a manual booking, a task reward and a role
 * salary. The largest booking that comes from such a value is the payer
 * booking of a SILC task: the reward for each of up to 250 completionists
 * (the limit of `completeTask`), thus at most 250,000,000. This stays in the
 * 32-bit integer range of the value and balance columns (2,147,483,647).
 */
export const MAX_SILC_VALUE = 1_000_000;
