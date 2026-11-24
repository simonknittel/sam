/**
 * The cookies of the admin toolbar. Only its server actions write them. Only
 * the server reads them, on each request. The browser gets the admin mode from
 * the layout of `/app` (see `AdminModeContext`).
 */

export const ADMIN_MODE_COOKIE = "enable_admin";

export const ADMIN_MODE_COOKIE_VALUE = "1";

export const ADMIN_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const ASSUME_USER_COOKIE = "assume_user";

/**
 * Assuming a user swaps the whole session, also the creator of audit events.
 * Thus the cookie must not live much longer than a debugging session.
 */
export const ASSUME_USER_COOKIE_MAX_AGE = 60 * 60; // 1 hour
