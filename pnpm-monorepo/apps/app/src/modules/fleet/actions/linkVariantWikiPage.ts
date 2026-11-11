"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  linkVariantWikiPageInputSchema,
  linkVariantWikiPage as linkVariantWikiPageUseCase,
} from "@sam-monorepo/application";
import { FLEET_ERROR_TEXTS } from "../utils/fleetErrorTexts";

export const linkVariantWikiPage = createUseCaseAction({
  name: "linkVariantWikiPage",
  schema: linkVariantWikiPageInputSchema,
  useCase: linkVariantWikiPageUseCase,
  texts: FLEET_ERROR_TEXTS,
  parseFormData: (formData) => ({
    variant_id: formData.get("variantId"),
    wiki_page_id: formData.get("wikiPageId"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
