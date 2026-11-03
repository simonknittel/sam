"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateEventWikiPagePermissionsInputSchema,
  updateEventWikiPagePermissions as updateEventWikiPagePermissionsUseCase,
} from "@sam-monorepo/application";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

/** See `updateEventWikiPagePermissions()` of the application */
export const updateEventWikiPagePermissions = createUseCaseAction({
  name: "updateEventWikiPagePermissions",
  schema: updateEventWikiPagePermissionsInputSchema,
  useCase: updateEventWikiPagePermissionsUseCase,
  parseFormData: (formData) => ({
    page_id: formData.get("id"),
    read_scope: formData.get("readScope"),
    /** The select sends an empty value when no position is selected */
    read_scope_position_id: formData.get("readScopePositionId") || null,
    edit_scope: formData.get("editScope"),
    image_uploadability: formData.get("imageUploadability"),
    attachment_uploadability: formData.get("attachmentUploadability"),
  }),
  texts: WIKI_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
