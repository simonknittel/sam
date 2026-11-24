"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  destroyWikiPageInputSchema,
  destroyWikiPage as destroyWikiPageUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const destroyWikiPage = createUseCaseAction({
  name: "destroyWikiPage",
  schema: destroyWikiPageInputSchema,
  useCase: destroyWikiPageUseCase,
  parseFormData: (formData) => ({ page_id: formData.get("id") }),
  texts: WIKI_ERROR_TEXTS,
  success: () => "Endgültig gelöscht.",
});
