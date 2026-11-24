import type { Translations } from "@/modules/actions/utils/createAction";
import type { ApplicationErrorTexts } from "@/modules/application";
import { OrganizationErrorMessage } from "@sam-monorepo/application";

export const getOrganizationErrorTexts = (
  t: Translations,
): ApplicationErrorTexts => ({
  [OrganizationErrorMessage.SpectrumIdTaken]:
    "Eine Organisation mit dieser Spectrum ID existiert bereits.",
  [OrganizationErrorMessage.OrganizationNotFound]: t("Common.notFound"),
  [OrganizationErrorMessage.AlreadyConfirmed]:
    "Der Eintrag wurde bereits bestätigt.",
});
