"use server";

import { createUseCaseAction } from "@/modules/application";
import { WIKI_ERROR_TEXTS } from "@/modules/wiki/utils/wikiErrorTexts";
import {
  createVariantWikiPageInputSchema,
  createVariantWikiPage as createVariantWikiPageUseCase,
} from "@sam-monorepo/application";
import { FLEET_ERROR_TEXTS } from "../utils/fleetErrorTexts";

export const createVariantWikiPage = createUseCaseAction({
  name: "createVariantWikiPage",
  schema: createVariantWikiPageInputSchema,
  useCase: createVariantWikiPageUseCase,
  texts: { ...WIKI_ERROR_TEXTS, ...FLEET_ERROR_TEXTS },
  parseFormData: (formData) => ({
    variant_id: formData.get("variantId"),
    title: formData.get("title"),
    // An empty value creates a top-level page
    parent_id: formData.get("parentId") || undefined,
  }),
  success: (t) => t("Common.successfullySaved"),
});
