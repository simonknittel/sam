import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowUniqueConstraintFailed } from "../errors.js";
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

export const createRoleTagInputSchema = z.object({
  name: roleTagNameSchema.describe(
    "The name of the new tag. Each tag has a different name, without regard to the case.",
  ),
  description: roleTagDescriptionSchema
    .nullish()
    .describe(
      "Plain text. The role picker shows it as a tooltip. Null or an empty text gives no description.",
    ),
  role_ids: roleTagAssignmentIdsSchema.describe("The roles that get the tag."),
});

export type CreateRoleTagInput = z.output<typeof createRoleTagInputSchema>;

export type CreateRoleTagOutput = RoleTagOutput;

/**
 * Creates a tag, optionally with its first roles. Requires `role;manage`.
 *
 * @throws ValidationError when a tag with the name exists already
 * @throws NotFoundError when a role does not exist
 */
export const createRoleTag = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateRoleTagInput,
): Promise<CreateRoleTagOutput> =>
  withSpan(context, "createRoleTag", async () => {
    requirePermission(actor, "role", "manage");

    const citizenId = actor.citizen?.id ?? null;
    const roleIds = toUniqueAssignmentIds(input.role_ids, []);

    const { tag, changes } = await rethrowUniqueConstraintFailed(
      () =>
        context.prisma.$transaction(async (transaction) => {
          const { id: tagId } = await transaction.roleTag.create({
            data: {
              name: input.name,
              description: input.description || null,
              createdById: citizenId,
              updatedById: citizenId,
            },
            select: { id: true },
          });

          const changes = await writeRolesOfTag(transaction, {
            tagId,
            roleIds,
            createdById: citizenId,
          });

          const tag = await transaction.roleTag.findUniqueOrThrow({
            where: { id: tagId },
            select: ROLE_TAG_BADGE_SELECT,
          });

          return { tag, changes };
        }),
      RoleTagErrorMessage.NameTaken,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_TAG_CREATED,
        data: { tagId: tag.id, name: tag.name, description: tag.description },
        createdById: actor.userId,
      },
      ...toRoleTagAssignmentAuditEvents(changes, actor.userId),
    ]);

    return toRoleTagOutput(context, toRoleTagBadge(actor, tag));
  });
