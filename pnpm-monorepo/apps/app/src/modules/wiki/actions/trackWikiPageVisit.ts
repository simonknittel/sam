"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  trackWikiPageVisitInputSchema,
  trackWikiPageVisit as trackWikiPageVisitUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const trackWikiPageVisit = createUseCaseAction({
  name: "trackWikiPageVisit",
  schema: trackWikiPageVisitInputSchema,
  useCase: trackWikiPageVisitUseCase,
  parseFormData: (formData) => ({ page_id: formData.get("pageId") }),
  texts: WIKI_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: () => "Seitenbesuch gespeichert.",
});
