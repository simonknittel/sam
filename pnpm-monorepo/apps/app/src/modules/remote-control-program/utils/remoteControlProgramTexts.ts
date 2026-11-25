import { LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS } from "@sam-monorepo/domain";

/**
 * The texts of the Remote Control Program for the facts that the sharing
 * popover and the control UIs (for example the Log Analyzer) both tell. One
 * text for each fact, thus the user reads the same words in each place.
 */

/** The browsers with the File System Access API that SAM supports */
export const SUPPORTED_BROWSERS_TEXT =
  "Den Log-Ordner können nur Google Chrome, Microsoft Edge und Opera GX am Computer lesen. Mozilla Firefox, Safari und Brave können es nicht.";

export const BROWSER_NOT_SUPPORTED_TEXT = `Dieser Browser wird nicht unterstützt. ${SUPPORTED_BROWSERS_TEXT}`;

/** The app has no relay service, for example a preview deployment */
export const NO_RELAY_TEXT =
  "Diese Umgebung hat kein Relay. Nichts wird hochgeladen oder geteilt, und du siehst nur deine eigenen Einträge aus diesem Browser.";

/**
 * SAM or the relay refused the access of the user: a permission is missing,
 * or the user is banned
 */
export const ACCESS_DENIED_TEXT =
  "Das Relay lehnt diesen Browser ab: Dir fehlt die Berechtigung, oder dein Account ist gesperrt.";

/** The session of the browser ended, for example after a logout in a different tab */
export const SESSION_EXPIRED_TEXT =
  "Deine Anmeldung bei SAM ist abgelaufen. Melde dich neu an.";

export const LOG_ENTRIES_HISTORY_TEXT = `Einträge, die älter als ${LOG_ANALYZER_HISTORY_MINIMUM_AGE_HOURS} Stunden sind, sehen alle, die den Log Analyzer nutzen dürfen, auch ohne Freigabe.`;
