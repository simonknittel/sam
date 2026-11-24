"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateWikiPagePositionInputSchema,
  updateWikiPagePosition as updateWikiPagePositionUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const updateWikiPagePosition = createUseCaseAction({
  name: "updateWikiPagePosition",
  schema: updateWikiPagePositionInputSchema,
  useCase: updateWikiPagePositionUseCase,
  parseFormData: (formData) => ({
    page_id: formData.get("id"),
    reference_page_id: formData.get("referenceId"),
    position: formData.get("position"),
  }),
  texts: WIKI_ERROR_TEXTS,
  success: (t, result) =>
    result.moved_to_new_parent
      ? "Erfolgreich verschoben. Die Seite und ihre Unterseiten übernehmen jetzt die Berechtigungen des neuen Elternteils."
      : t("Common.successfullySaved"),
});
