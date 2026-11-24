"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  restoreWikiPageInputSchema,
  restoreWikiPage as restoreWikiPageUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const restoreWikiPage = createUseCaseAction({
  name: "restoreWikiPage",
  schema: restoreWikiPageInputSchema,
  useCase: restoreWikiPageUseCase,
  parseFormData: (formData) => ({ page_id: formData.get("id") }),
  texts: WIKI_ERROR_TEXTS,
  success: () => "Erfolgreich wiederhergestellt.",
});
