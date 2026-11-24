/**
 * The limits of the tasks. The forms of the app, the use cases and the MCP
 * tools use the same values.
 */

/** The length of the title field of the task forms */
export const TASK_TITLE_MAX_LENGTH = 64;

/**
 * Arbitrary (untested) cap so a hostile client cannot store an unbounded
 * description
 */
export const TASK_DESCRIPTION_MAX_LENGTH = 2048;

/** Arbitrary (untested) cap of the text of a reward that is no SILC */
export const TASK_REWARD_TEXT_MAX_LENGTH = 2048;

/** Arbitrary (untested) cap of the required roles, to prevent a denial of service */
export const TASK_MAX_REQUIRED_ROLES = 50;

/**
 * Arbitrary (untested) cap of the assignees and of the completionists of one
 * task, to prevent a denial of service
 */
export const TASK_MAX_CITIZENS = 250;
