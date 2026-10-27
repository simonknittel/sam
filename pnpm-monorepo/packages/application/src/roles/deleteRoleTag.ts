import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleTagErrorMessage } from "./roleErrors.js";

export const deleteRoleTagInputSchema = z.object({
  tag_id: idSchema,
});

export type DeleteRoleTagInput = z.output<typeof deleteRoleTagInputSchema>;

/** The tag before the delete */
export interface DeleteRoleTagOutput {
  readonly id: string;
  readonly name: string;
}

/**
 * Deletes a tag permanently. The roles lose the tag, and the roles stay.
 * Requires `role;manage`. The audit event keeps the name and all roles of
 * the tag.
 *
 * @throws NotFoundError when the tag does not exist
 */
export const deleteRoleTag = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteRoleTagInput,
): Promise<DeleteRoleTagOutput> =>
  withSpan(context, "deleteRoleTag", async () => {
    requirePermission(actor, "role", "manage");

    const tag = await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction(async (transaction) => {
          const tag = await transaction.roleTag.findUnique({
            where: { id: input.tag_id },
            select: {
              id: true,
              name: true,
              roles: {
                select: { roleId: true },
                orderBy: { role: { name: "asc" } },
              },
            },
          });
          if (!tag) throw new NotFoundError(RoleTagErrorMessage.NotFound);

          // The links go with the tag (cascade)
          await transaction.roleTag.delete({
            where: { id: tag.id },
            select: { id: true },
          });

          return tag;
        }),
      RoleTagErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_TAG_DELETED,
        data: {
          tagId: tag.id,
          name: tag.name,
          roleIds: tag.roles.map((assignment) => assignment.roleId),
        },
        createdById: actor.userId,
      },
    ]);

    return { id: tag.id, name: tag.name };
  });
