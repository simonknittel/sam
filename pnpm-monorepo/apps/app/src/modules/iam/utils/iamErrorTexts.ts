import type { Translations } from "@/modules/actions/utils/createAction";
import type { ApplicationErrorTexts } from "@/modules/application";
import { IamErrorMessage } from "@sam-monorepo/application";

/**
 * The unknown role needs a request that bypassed the options of the form, or a
 * role that a different user deleted.
 */
export const getIamErrorTexts = (t: Translations): ApplicationErrorTexts => ({
  [IamErrorMessage.UnknownRole]: t("Common.badRequest"),
});
