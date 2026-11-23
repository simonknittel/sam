import "server-only";

import type { ApplicationErrorTexts } from "@/modules/application";
import {
  MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER,
  RemoteControlProgramErrorMessage,
  ShareGrantErrorMessage,
} from "@sam-monorepo/application";

/**
 * The texts of the actions of the sharing popover for the errors of the use
 * cases. Only the server actions import this module, because it loads the
 * `application` package. A message without a text gets the common text of
 * its error class.
 */
export const REMOTE_CONTROL_PROGRAM_ERROR_TEXTS: ApplicationErrorTexts = {
  [RemoteControlProgramErrorMessage.CitizenMissing]:
    "Dein Account ist mit keinem Citizen verknüpft.",
  [RemoteControlProgramErrorMessage.AssumedUser]:
    "Als angenommener Benutzer kannst du das Remote Control Program nicht nutzen.",
  [RemoteControlProgramErrorMessage.PermissionMissing]:
    "Dir fehlt die Berechtigung „Remote Control Program nutzen“.",
};

export const SHARE_GRANT_ERROR_TEXTS: ApplicationErrorTexts = {
  ...REMOTE_CONTROL_PROGRAM_ERROR_TEXTS,
  [ShareGrantErrorMessage.GranteeIsOwner]:
    "Für dich selbst brauchst du keine Freigabe.",
  [ShareGrantErrorMessage.GranteeCitizenNotFound]:
    "Diesen Citizen gibt es nicht mehr.",
  [ShareGrantErrorMessage.GranteeRoleNotFound]:
    "Diese Rolle gibt es nicht, oder du kannst sie nicht sehen.",
  [ShareGrantErrorMessage.ValidityTimeNotValid]:
    "Der Start oder das Ende ist ungültig.",
  [ShareGrantErrorMessage.ValidityEndNotAfterStart]:
    "Das Ende muss nach dem Start liegen.",
  [ShareGrantErrorMessage.ValidityEndNotInFuture]:
    "Das Ende muss in der Zukunft liegen.",
  [ShareGrantErrorMessage.TooManyActiveGrants]: `Du hast schon ${MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER} aktive Freigaben. Widerrufe zuerst eine Freigabe.`,
  [ShareGrantErrorMessage.GrantNotFound]: "Diese Freigabe gibt es nicht mehr.",
};
