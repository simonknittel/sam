import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";
import { roleTagChangesInputShape } from "./roleInputSchemas.js";
import {
  toRoleTagAssignmentAuditEvents,
  toUniqueAssignmentIds,
  writeTagsOfRole,
} from "./roleTagAssignmentWrites.js";
import {
  ROLE_TAG_REFERENCES_SELECT,
  toRoleTagReferences,
  type RoleTagReference,
} from "./roleTagOutput.js";

export const changeRoleTagsInputSchema = z.object({
  role_id: idSchema,
  ...roleTagChangesInputShape,
});

export type ChangeRoleTagsInput = z.output<typeof changeRoleTagsInputSchema>;

export interface ChangeRoleTagsOutput {
  readonly role_id: string;
  /** All tags of the role after the change, sorted by name */
  readonly tags: RoleTagReference[];
  /** Only the tags that the role did not have before */
  readonly added_tag_ids: string[];
  /** Only the tags that the role had before */
  readonly removed_tag_ids: string[];
}

/**
 * Adds tags to a role and removes tags from it. The other tags of the role
 * stay. Requires `role;manage`. Only a real change writes the audit event
 * `ROLE_TAG_ASSIGNMENTS_UPDATED`.
 *
 * @throws NotFoundError when the role or a tag of `add_tag_ids` does not
 * exist
 * @throws ValidationError when a tag is in `add_tag_ids` and in
 * `remove_tag_ids`
 */
export const changeRoleTags = (
  context: ApplicationContext,
  actor: Actor,
  input: ChangeRoleTagsInput,
): Promise<ChangeRoleTagsOutput> =>
  withSpan(context, "changeRoleTags", async () => {
    requirePermission(actor, "role", "manage");

    const tagIds = toUniqueAssignmentIds(
      input.add_tag_ids,
      input.remove_tag_ids,
    );

    const { tags, changes } = await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction(async (transaction) => {
          const role = await transaction.role.findUnique({
            where: { id: input.role_id },
            select: { id: true },
          });
          if (!role) throw new NotFoundError(RoleErrorMessage.NotFound);

          const changes = await writeTagsOfRole(transaction, {
            roleId: role.id,
            tagIds,
            createdById: actor.citizen?.id ?? null,
          });

          const { tags } = await transaction.role.findUniqueOrThrow({
            where: { id: role.id },
            select: { tags: ROLE_TAG_REFERENCES_SELECT },
          });

          return { tags: toRoleTagReferences(tags), changes };
        }),
      RoleErrorMessage.NotFound,
    );

    const auditEvents = toRoleTagAssignmentAuditEvents(changes, actor.userId);
    if (auditEvents.length > 0) await context.audit.create(auditEvents);

    return {
      role_id: input.role_id,
      tags,
      added_tag_ids: changes.added.map((pair) => pair.tagId),
      removed_tag_ids: changes.removed.map((pair) => pair.tagId),
    };
  });
