/**
 * The cookies of the admin toolbar. Only its server actions write them. The
 * server reads them on each request, and `useAuthentication` reads the admin
 * mode cookie in the browser.
 */

/** Switches admin mode on, but only for a user with the admin role */
export const ADMIN_MODE_COOKIE = "enable_admin";

/** The only value which switches admin mode on */
export const ADMIN_MODE_COOKIE_VALUE = "1";

export const ADMIN_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Holds the id of the user an admin assumes */
export const ASSUME_USER_COOKIE = "assume_user";

/**
 * Assuming a user swaps the whole session, also the creator of audit events.
 * Thus the cookie must not live much longer than a debugging session.
 */
export const ASSUME_USER_COOKIE_MAX_AGE = 60 * 60; // 1 hour
