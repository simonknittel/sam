export { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";

/**
 * A citizen who gets a notification. A rule about a subject (an event, a
 * task, a role) gives the subject and its recipients, or null when the
 * subject does not exist. A greeting rule gives the one recipient, or null
 * when the citizen does not get the greeting.
 */
export interface Recipient {
  readonly citizenId: string;
}
