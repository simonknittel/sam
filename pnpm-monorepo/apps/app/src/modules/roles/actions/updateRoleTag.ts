"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  findManagedRoleTag,
  idSchema,
  NotFoundError,
  RoleTagErrorMessage,
  updateRoleTagInputSchema,
  updateRoleTag as updateRoleTagUseCase,
} from "@sam-monorepo/application";
import { ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM } from "@sam-monorepo/domain";
import * as z from "zod";

/** The form gives all roles of the tag, not the add and remove lists */
const updateRoleTagFormSchema = updateRoleTagInputSchema
  .omit({ add_role_ids: true, remove_role_ids: true })
  .extend({
    role_ids: z.array(idSchema).max(ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM),
  });

/**
 * Saves the name, the description and the roles of a tag. The action
 * compares the roles of the form with the current roles of the tag: the
 * difference gives the add and remove lists of the use case.
 */
export const updateRoleTag = createUseCaseAction({
  name: "updateRoleTag",
  schema: updateRoleTagFormSchema,
  useCase: async (context, actor, { role_ids: roleIds, ...input }) => {
    const tag = await findManagedRoleTag(context, actor, input.tag_id);
    if (!tag) throw new NotFoundError(RoleTagErrorMessage.NotFound);

    const currentRoleIds = new Set(tag.roleIds);
    const selectedRoleIds = new Set(roleIds);

    return updateRoleTagUseCase(context, actor, {
      ...input,
      add_role_ids: roleIds.filter((roleId) => !currentRoleIds.has(roleId)),
      remove_role_ids: tag.roleIds.filter(
        (roleId) => !selectedRoleIds.has(roleId),
      ),
    });
  },
  parseFormData: (formData) => ({
    tag_id: formData.get("tagId"),
    name: formData.get("name"),
    description: formData.get("description"),
    role_ids: formData.getAll("roleIds"),
  }),
  texts: {
    [RoleTagErrorMessage.NameTaken]:
      "Ein Tag mit diesem Namen existiert bereits.",
  },
  success: (t) => t("Common.successfullySaved"),
});
