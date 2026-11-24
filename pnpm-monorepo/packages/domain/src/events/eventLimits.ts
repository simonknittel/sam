export const EVENT_NAME_MAX_LENGTH = 128;

/**
 * Arbitrary (untested) cap so a hostile client cannot make one request write
 * thousands of visibility rows
 */
export const EVENT_MAX_VISIBILITY_ROLES = 50;

/**
 * Arbitrary (untested) cap of the citizens of one request (add, invite,
 * answer or remove), to prevent a denial of service
 */
export const EVENT_MAX_CITIZENS_PER_REQUEST = 50;

/**
 * The longest text of a participation, an invitation, an application or a
 * removal (comment, message or reason)
 */
export const EVENT_PARTICIPATION_TEXT_MAX_LENGTH = 500;
