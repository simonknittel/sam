import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  ROLE_DESCRIPTION_MAXIMUM_LENGTH,
  ROLE_INACTIVITY_DAYS_MAXIMUM,
  ROLE_INACTIVITY_DAYS_MINIMUM,
  ROLE_LEVEL_MAXIMUM,
  ROLE_LEVEL_MINIMUM,
  type AuditEventInput,
} from "@sam-monorepo/domain";
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
import { RoleErrorMessage } from "./roleErrors.js";
import {
  roleNameSchema,
  roleTagAssignmentIdsSchema,
} from "./roleInputSchemas.js";
import {
  toRoleTagAssignmentAuditEvents,
  toUniqueAssignmentIds,
  writeTagsOfRole,
} from "./roleTagAssignmentWrites.js";

const inactivityDaysSchema = z
  .int()
  .min(ROLE_INACTIVITY_DAYS_MINIMUM)
  .max(ROLE_INACTIVITY_DAYS_MAXIMUM);

/**
 * A field that is not given stays. The role form of the app gives all fields
 * of the role and no tags, the tag form of the role page only the tags.
 */
export const updateRoleInputSchema = z.object({
  role_id: idSchema,
  name: roleNameSchema.optional(),
  description: z
    .string()
    .max(ROLE_DESCRIPTION_MAXIMUM_LENGTH)
    .nullish()
    .describe("Markdown. Null removes the description."),
  max_age_days: inactivityDaysSchema
    .nullish()
    .describe(
      "The number of days of inactivity after which a citizen loses the role. Null turns the removal off.",
    ),
  assign_after_inactive_days: inactivityDaysSchema
    .nullish()
    .describe(
      "The number of days of inactivity after which a citizen gets the role. Null turns the assignment off.",
    ),
  max_level: z
    .int()
    .min(ROLE_LEVEL_MINIMUM)
    .max(ROLE_LEVEL_MAXIMUM)
    .nullish()
    .describe(
      "The number of levels that a citizen must reach to get the permissions of the role. Null removes the levels.",
    ),
  add_tag_ids: roleTagAssignmentIdsSchema.describe(
    "The tags that the role gets. The other tags of the role stay.",
  ),
  remove_tag_ids: roleTagAssignmentIdsSchema.describe(
    "The tags that the role loses.",
  ),
});

export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

export interface UpdateRoleOutput {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly max_age_days: number | null;
  readonly assign_after_inactive_days: number | null;
  readonly max_level: number | null;
}

const ROLE_FIELDS_SELECT = {
  id: true,
  name: true,
  description: true,
  maxAgeDays: true,
  assignAfterInactiveDays: true,
  maxLevel: true,
} as const satisfies Prisma.RoleSelect;

/**
 * Changes the given fields of a role (the name, the description, the
 * inactivity rules and the levels), and adds tags to the role or removes tags
 * from it, in one transaction. Requires `role;manage`.
 *
 * A call with a field writes `ROLE_UPDATED_V4`, also when the values stay. A
 * call without a field (for example only with tags) does not write it. Only
 * a real change of the tags writes `ROLE_TAG_ASSIGNMENTS_UPDATED`.
 *
 * @throws NotFoundError when the role or a tag of `add_tag_ids` does not
 * exist
 * @throws ValidationError when a different role has the name, or when a tag
 * is in `add_tag_ids` and in `remove_tag_ids`
 */
export const updateRole = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateRoleInput,
): Promise<UpdateRoleOutput> =>
  withSpan(context, "updateRole", async () => {
    requirePermission(actor, "role", "manage");

    const tagIds = toUniqueAssignmentIds(
      input.add_tag_ids,
      input.remove_tag_ids,
    );
    const changesFields = [
      input.name,
      input.description,
      input.max_age_days,
      input.assign_after_inactive_days,
      input.max_level,
    ].some((value) => value !== undefined);

    const { existingRole, updatedRole, tagChanges } =
      await rethrowUniqueConstraintFailed(
        () =>
          rethrowRecordNotFound(
            () =>
              context.prisma.$transaction(async (transaction) => {
                const existingRole = await transaction.role.findUnique({
                  where: { id: input.role_id },
                  select: ROLE_FIELDS_SELECT,
                });
                if (!existingRole)
                  throw new NotFoundError(RoleErrorMessage.NotFound);

                const updatedRole = changesFields
                  ? await transaction.role.update({
                      where: { id: existingRole.id },
                      data: {
                        name: input.name,
                        description: input.description,
                        maxAgeDays: input.max_age_days,
                        assignAfterInactiveDays:
                          input.assign_after_inactive_days,
                        maxLevel: input.max_level,
                      },
                      select: ROLE_FIELDS_SELECT,
                    })
                  : existingRole;

                const tagChanges = await writeTagsOfRole(transaction, {
                  roleId: existingRole.id,
                  tagIds,
                  createdById: actor.citizen?.id ?? null,
                });

                return { existingRole, updatedRole, tagChanges };
              }),
            RoleErrorMessage.NotFound,
          ),
        RoleErrorMessage.NameTaken,
      );

    const roleEvents: AuditEventInput[] = changesFields
      ? [
          {
            type: AuditEventType.ROLE_UPDATED_V4,
            data: {
              roleId: updatedRole.id,
              previousName: existingRole.name,
              newName: updatedRole.name,
              previousMaxAgeDays: existingRole.maxAgeDays,
              newMaxAgeDays: updatedRole.maxAgeDays,
              previousAssignAfterInactiveDays:
                existingRole.assignAfterInactiveDays,
              newAssignAfterInactiveDays: updatedRole.assignAfterInactiveDays,
              previousDescription: existingRole.description,
              newDescription: updatedRole.description,
              previousMaxLevel: existingRole.maxLevel,
              newMaxLevel: updatedRole.maxLevel,
            },
            createdById: actor.userId,
          },
        ]
      : [];
    const auditEvents = [
      ...roleEvents,
      ...toRoleTagAssignmentAuditEvents(tagChanges, actor.userId),
    ];
    if (auditEvents.length > 0) await context.audit.create(auditEvents);

    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      max_age_days: updatedRole.maxAgeDays,
      assign_after_inactive_days: updatedRole.assignAfterInactiveDays,
      max_level: updatedRole.maxLevel,
    };
  });
