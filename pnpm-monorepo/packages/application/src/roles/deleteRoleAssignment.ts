import { RoleAssignmentChangeType } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createRoleAssignmentChanges } from "./roleAssignmentWrites.js";
import { RoleAssignmentErrorMessage } from "./roleErrors.js";

export const deleteRoleAssignmentInputSchema = z.object({
  citizen_id: idSchema,
  role_id: idSchema,
});

export type DeleteRoleAssignmentInput = z.infer<
  typeof deleteRoleAssignmentInputSchema
>;

export interface DeleteRoleAssignmentOutput {
  readonly citizen_id: string;
  readonly role_id: string;
}

export const deleteRoleAssignment = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteRoleAssignmentInput,
): Promise<DeleteRoleAssignmentOutput> =>
  withSpan(context, "deleteRoleAssignment", async () => {
    const actorCitizen = requireCitizen(actor);
    requirePermission(actor, "otherRole", "dismiss", [
      { key: "roleId", value: input.role_id },
    ]);

    await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction([
          context.prisma.roleAssignment.delete({
            where: {
              citizenId_roleId: {
                citizenId: input.citizen_id,
                roleId: input.role_id,
              },
            },
            select: { id: true },
          }),
          createRoleAssignmentChanges(
            context.prisma,
            [
              {
                citizenId: input.citizen_id,
                roleId: input.role_id,
                type: RoleAssignmentChangeType.REMOVE,
              },
            ],
            actorCitizen.id,
          ),
        ]),
      RoleAssignmentErrorMessage.NotAssigned,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_ASSIGNMENT_DELETED,
        data: { citizenId: input.citizen_id, roleId: input.role_id },
        createdById: actor.userId,
      },
    ]);

    return { citizen_id: input.citizen_id, role_id: input.role_id };
  });
