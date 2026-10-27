"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  changeRoleTagsInputSchema,
  changeRoleTags as changeRoleTagsUseCase,
  findManagedRole,
  idSchema,
  NotFoundError,
  RoleErrorMessage,
} from "@sam-monorepo/application";
import { ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM } from "@sam-monorepo/domain";
import * as z from "zod";

/** The form gives all tags of the role, not the add and remove lists */
const changeRoleTagsFormSchema = changeRoleTagsInputSchema
  .omit({ add_tag_ids: true, remove_tag_ids: true })
  .extend({
    tag_ids: z.array(idSchema).max(ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM),
  });

/**
 * Saves the tags of a role. The action compares the tags of the form with
 * the current tags of the role: the difference gives the add and remove
 * lists of the use case.
 */
export const changeRoleTags = createUseCaseAction({
  name: "changeRoleTags",
  schema: changeRoleTagsFormSchema,
  useCase: async (context, actor, { role_id: roleId, tag_ids: tagIds }) => {
    const role = await findManagedRole(context, actor, roleId);
    if (!role) throw new NotFoundError(RoleErrorMessage.NotFound);

    const currentTagIds = role.tags.map((assignment) => assignment.tagId);
    const currentTagIdSet = new Set(currentTagIds);
    const selectedTagIds = new Set(tagIds);

    return changeRoleTagsUseCase(context, actor, {
      role_id: roleId,
      add_tag_ids: tagIds.filter((tagId) => !currentTagIdSet.has(tagId)),
      remove_tag_ids: currentTagIds.filter(
        (tagId) => !selectedTagIds.has(tagId),
      ),
    });
  },
  parseFormData: (formData) => ({
    role_id: formData.get("roleId"),
    tag_ids: formData.getAll("tagIds"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
