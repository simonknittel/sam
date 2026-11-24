"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  updateWikiPageFavoriteInputSchema,
  updateWikiPageFavorite as updateWikiPageFavoriteUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const updateWikiPageFavorite = createUseCaseAction({
  name: "updateWikiPageFavorite",
  schema: updateWikiPageFavoriteInputSchema,
  useCase: updateWikiPageFavoriteUseCase,
  parseFormData: (formData) => ({
    page_id: formData.get("pageId"),
    is_favorite: formData.get("isFavorite") === "1",
  }),
  texts: WIKI_ERROR_TEXTS,
  /** Also without a change: a different tab can have set the state before */
  refresh: ActionRefresh.Always,
  success: (t, result) =>
    result.is_favorite ? "Als Favorit gespeichert." : "Favorit entfernt.",
});
