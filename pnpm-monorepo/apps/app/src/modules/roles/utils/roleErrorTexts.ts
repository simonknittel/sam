import type { Translations } from "@/modules/actions/utils/createAction";
import type { ApplicationErrorTexts } from "@/modules/application";
import {
  RoleAssignmentErrorMessage,
  RoleErrorMessage,
  RoleTagErrorMessage,
} from "@sam-monorepo/application";

export const getRoleErrorTexts = (t: Translations): ApplicationErrorTexts => ({
  [RoleErrorMessage.NameTaken]:
    "Eine Rolle mit diesem Namen existiert bereits.",
  [RoleAssignmentErrorMessage.CitizenDeleted]: "Der Citizen ist gelöscht.",
  // A different user removed the levels of the role
  [RoleAssignmentErrorMessage.RoleHasNoLevels]: t("Common.badRequest"),
});

export const ROLE_TAG_ERROR_TEXTS: ApplicationErrorTexts = {
  [RoleTagErrorMessage.NameTaken]:
    "Ein Tag mit diesem Namen existiert bereits.",
};
