/**
 * The limits of the manual notifications. The form of the app, the use cases,
 * the MCP tool and the on-site payload schema use the same values.
 */

/** The same length as the titles of the greetings */
export const MANUAL_NOTIFICATION_TITLE_MAX_LENGTH = 100;

/** Room for a short message that a web push notification can show */
export const MANUAL_NOTIFICATION_BODY_MAX_LENGTH = 500;

/** Cap of the selected citizens of one notification, to prevent a denial of service */
export const MANUAL_NOTIFICATION_MAX_RECEIVER_CITIZENS = 100;

/** Cap of the selected roles of one notification, to prevent a denial of service */
export const MANUAL_NOTIFICATION_MAX_RECEIVER_ROLES = 25;
