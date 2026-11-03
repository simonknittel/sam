"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createWikiPageReportInputSchema,
  createWikiPageReport as createWikiPageReportUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const createWikiPageReport = createUseCaseAction({
  name: "createWikiPageReport",
  schema: createWikiPageReportInputSchema,
  useCase: createWikiPageReportUseCase,
  parseFormData: (formData) => ({
    page_id: formData.get("pageId"),
    /** Only the form of an attachment sends the field */
    upload_id: formData.get("uploadId") ?? undefined,
    message: formData.get("message"),
  }),
  texts: WIKI_ERROR_TEXTS,
  success: () => "Meldung gesendet.",
});
