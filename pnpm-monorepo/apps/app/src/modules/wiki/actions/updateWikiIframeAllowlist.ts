"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateWikiIframeAllowlistInputSchema,
  updateWikiIframeAllowlist as updateWikiIframeAllowlistUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const updateWikiIframeAllowlist = createUseCaseAction({
  name: "updateWikiIframeAllowlist",
  schema: updateWikiIframeAllowlistInputSchema,
  useCase: updateWikiIframeAllowlistUseCase,
  parseFormData: (formData) => ({ domains: formData.getAll("domain") }),
  texts: WIKI_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
