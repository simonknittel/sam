"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  updateWikiPagePermissionsInputSchema,
  updateWikiPagePermissions as updateWikiPagePermissionsUseCase,
  WikiRolesCannotReadParentError,
  type UpdateWikiPagePermissionsOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";

export const updateWikiPagePermissions = createAuthenticatedAction(
  "updateWikiPagePermissions",
  updateWikiPagePermissionsInputSchema,
  async (formData, authentication, data, t) => {
    let result: UpdateWikiPagePermissionsOutput;
    try {
      result = await updateWikiPagePermissionsUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
      );
    } catch (error) {
      /** The refresh gives the pickers the roles of today */
      if (error instanceof WikiRolesCannotReadParentError)
        return rejectConflict(
          `Diese Rollen dürfen die übergeordnete Seite nicht lesen und können deshalb auch auf diese Seite keinen Zugriff erhalten: ${error.roleNames.join(", ")}.`,
          formData,
        );

      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: WIKI_ERROR_TEXTS,
      });
    }

    refresh();

    return {
      success:
        result.pruned_page_count > 0
          ? `Erfolgreich gespeichert. Auf ${result.pruned_page_count} Unterseite(n) wurden Rollen entfernt, die dadurch keinen Zugriff mehr hatten.`
          : t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      page_id: formData.get("id"),
      visibility: formData.get("visibility"),
      editability: formData.get("editability"),
      image_uploadability: formData.get("imageUploadability"),
      attachment_uploadability: formData.get("attachmentUploadability"),
      read_role_ids: formData.getAll("readRole[]"),
      edit_role_ids: formData.getAll("editRole[]"),
      admin_role_ids: formData.getAll("adminRole[]"),
      cascade_visibility: formData.get("cascadeVisibility") !== null,
      cascade_editability: formData.get("cascadeEditability") !== null,
      cascade_admin_roles: formData.get("cascadeAdminRoles") !== null,
      cascade_image_uploadability:
        formData.get("cascadeImageUploadability") !== null,
      cascade_attachment_uploadability:
        formData.get("cascadeAttachmentUploadability") !== null,
      cascade_owner: formData.get("cascadeOwner") !== null,
      owner_mode: formData.get("ownerMode"),
      new_owner_id: formData.get("newOwnerId") || undefined,
    }),
  },
);
