"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  DisallowedWikiIframesError,
  importWikiPageContentInputSchema,
  importWikiPageContent as importWikiPageContentUseCase,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

/**
 * A failed replace keeps the safety snapshot, thus the refresh of the error
 * shows it in the snapshot list.
 */
export const importWikiPageContent = createAuthenticatedAction(
  "importWikiPageContent",
  importWikiPageContentInputSchema,
  async (formData, authentication, data, t) => {
    try {
      await importWikiPageContentUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        { safetySnapshotName: "Automatische Sicherung vor Import" },
      );
    } catch (error) {
      if (error instanceof DisallowedWikiIframesError)
        return {
          error: `Die Datei enthält iframes von nicht erlaubten Domains: ${error.sources.join(", ")}`,
          requestPayload: formData,
        };

      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: WIKI_ERROR_TEXTS,
      });
    }

    refresh();

    return { success: "Inhalt importiert." };
  },
  {
    parseFormData: (formData) => ({
      page_id: formData.get("id"),
      content: formData.get("content"),
    }),
  },
);
