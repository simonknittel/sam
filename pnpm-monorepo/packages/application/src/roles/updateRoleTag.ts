import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  NotFoundError,
  rethrowRecordNotFound,
  rethrowUniqueConstraintFailed,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleTagErrorMessage } from "./roleErrors.js";
import {
  roleTagAssignmentIdsSchema,
  roleTagDescriptionSchema,
  roleTagNameSchema,
} from "./roleInputSchemas.js";
import {
  toRoleTagAssignmentAuditEvents,
  toUniqueAssignmentIds,
  writeRolesOfTag,
} from "./roleTagAssignmentWrites.js";
import { ROLE_TAG_BADGE_SELECT, toRoleTagBadge } from "./roleTagBadges.js";
import { toRoleTagOutput, type RoleTagOutput } from "./roleTagOutput.js";

/** A field that is not given stays */
export const updateRoleTagInputSchema = z.object({
  tag_id: idSchema,
  name: roleTagNameSchema
    .optional()
    .describe(
      "Each tag has a different name, without regard to the case. A change of the letter case is a change.",
    ),
  description: roleTagDescriptionSchema
    .nullish()
    .describe("Plain text. Null or an empty text removes the description."),
  add_role_ids: roleTagAssignmentIdsSchema.describe(
    "The roles that get the tag. The other roles of the tag stay.",
  ),
  remove_role_ids: roleTagAssignmentIdsSchema.describe(
    "The roles that lose the tag.",
  ),
});

export type UpdateRoleTagInput = z.output<typeof updateRoleTagInputSchema>;

export type UpdateRoleTagOutput = RoleTagOutput;

/**
 * Changes the given fields of a tag (the name and the description) and adds
 * roles to it or removes roles from it. Requires `role;manage`. Only a real
 * change writes an audit event: a change of the name or of the description
 * `ROLE_TAG_UPDATED`, a change of the roles `ROLE_TAG_ASSIGNMENTS_UPDATED`.
 *
 * @throws NotFoundError when the tag or a role of `add_role_ids` does not
 * exist
 * @throws ValidationError when a different tag has the name, or when a role
 * is in `add_role_ids` and in `remove_role_ids`
 */
export const updateRoleTag = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateRoleTagInput,
): Promise<UpdateRoleTagOutput> =>
  withSpan(context, "updateRoleTag", async () => {
    requirePermission(actor, "role", "manage");

    const roleIds = toUniqueAssignmentIds(
      input.add_role_ids,
      input.remove_role_ids,
    );
    const citizenId = actor.citizen?.id ?? null;

    const { previousTag, tag, changes } = await rethrowUniqueConstraintFailed(
      () =>
        rethrowRecordNotFound(
          () =>
            context.prisma.$transaction(async (transaction) => {
              const previousTag = await transaction.roleTag.findUnique({
                where: { id: input.tag_id },
                select: { id: true, name: true, description: true },
              });
              if (!previousTag)
                throw new NotFoundError(RoleTagErrorMessage.NotFound);

              const name = input.name ?? previousTag.name;
              const description =
                input.description === undefined
                  ? previousTag.description
                  : input.description || null;
              if (
                name !== previousTag.name ||
                description !== previousTag.description
              )
                await transaction.roleTag.update({
                  where: { id: previousTag.id },
                  data: { name, description, updatedById: citizenId },
                  select: { id: true },
                });

              const changes = await writeRolesOfTag(transaction, {
                tagId: previousTag.id,
                roleIds,
                createdById: citizenId,
              });

              const tag = await transaction.roleTag.findUniqueOrThrow({
                where: { id: previousTag.id },
                select: ROLE_TAG_BADGE_SELECT,
              });

              return { previousTag, tag, changes };
            }),
          RoleTagErrorMessage.NotFound,
        ),
      RoleTagErrorMessage.NameTaken,
    );

    const tagEvents: AuditEventInput[] =
      tag.name !== previousTag.name ||
      tag.description !== previousTag.description
        ? [
            {
              type: AuditEventType.ROLE_TAG_UPDATED,
              data: {
                tagId: tag.id,
                previousName: previousTag.name,
                newName: tag.name,
                previousDescription: previousTag.description,
                newDescription: tag.description,
              },
              createdById: actor.userId,
            },
          ]
        : [];
    const auditEvents = [
      ...tagEvents,
      ...toRoleTagAssignmentAuditEvents(changes, actor.userId),
    ];
    if (auditEvents.length > 0) await context.audit.create(auditEvents);

    return toRoleTagOutput(context, toRoleTagBadge(actor, tag));
  });
