import type { Citizen } from "@sam-monorepo/database/client";

/** A record names a deleted citizen with this text, never with the handle */
export const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

/** The name of a citizen as a record or a notification shows it */
export const getCitizenDisplayName = (
  citizen: Pick<Citizen, "id" | "handle" | "deletedAt">,
) => (citizen.deletedAt ? DELETED_CITIZEN_LABEL : citizen.handle || citizen.id);
