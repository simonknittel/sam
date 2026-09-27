import { type Citizen } from "@sam-monorepo/database";

/** The same label as `DELETED_CITIZEN_LABEL` of the app */
const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

/**
 * The name of a citizen in a notification text. A deleted citizen never
 * shows with the handle.
 */
export const getCitizenDisplayName = (
  citizen: Pick<Citizen, "handle" | "deletedAt">,
) => (citizen.deletedAt ? DELETED_CITIZEN_LABEL : citizen.handle);
