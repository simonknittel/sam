import { LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS } from "@sam-monorepo/domain";

/**
 * The texts of the Remote Control Program for the facts that the sharing
 * popover and the control UIs (for example the Log Analyzer) both tell. One
 * text for each fact, thus the user reads the same words in each place.
 */

/** The browsers with the File System Access API that SAM supports */
export const SUPPORTED_BROWSERS_TEXT =
  "Das funktioniert nur am Computer mit Google Chrome, Microsoft Edge oder Opera GX, nicht mit Mozilla Firefox, Safari oder Brave.";

export const BROWSER_NOT_SUPPORTED_TEXT = `Dieser Browser wird nicht unterstützt. ${SUPPORTED_BROWSERS_TEXT}`;

/** The app has no relay service, for example a preview deployment */
export const NO_RELAY_TEXT =
  "In dieser Umgebung gibt es kein Relay. Es wird nichts hochgeladen oder geteilt, und du siehst nur deine eigenen Einträge aus diesem Browser.";

/**
 * SAM or the relay refused the access of the user: a permission is missing,
 * or the user is banned
 */
export const ACCESS_DENIED_TEXT =
  "Das Relay hat die Verbindung abgelehnt. Entweder fehlt dir die Berechtigung, oder dein Account ist gesperrt.";

/** The session of the browser ended, for example after a logout in a different tab */
export const SESSION_EXPIRED_TEXT =
  "Deine Anmeldung bei SAM ist abgelaufen. Melde dich neu an.";

export const LOG_ENTRIES_HISTORY_TEXT = `Einträge, die älter als ${LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS} Stunden sind, können von allen gesehen werden, die in den entsprechenden Apps die Berechtigung dazu haben.`;
