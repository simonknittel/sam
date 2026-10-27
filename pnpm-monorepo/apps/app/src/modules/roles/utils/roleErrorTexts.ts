import type { Translations } from "@/modules/actions/utils/createAction";
import type { ApplicationErrorTexts } from "@/modules/application";
import {
  RoleAssignmentErrorMessage,
  RoleErrorMessage,
  RoleTagErrorMessage,
} from "@sam-monorepo/application";

/**
 * The texts of the role and role-assignment actions for the errors of their
 * use cases. The other errors get the common text of their error class.
 */
export const getRoleErrorTexts = (t: Translations): ApplicationErrorTexts => ({
  [RoleErrorMessage.NameTaken]:
    "Eine Rolle mit diesem Namen existiert bereits.",
  [RoleAssignmentErrorMessage.CitizenDeleted]: "Der Citizen ist gelöscht.",
  // A different user removed the levels of the role
  [RoleAssignmentErrorMessage.RoleHasNoLevels]: t("Common.badRequest"),
});

/** The texts of the tag actions for the errors of their use cases */
export const ROLE_TAG_ERROR_TEXTS: ApplicationErrorTexts = {
  [RoleTagErrorMessage.NameTaken]:
    "Ein Tag mit diesem Namen existiert bereits.",
};
