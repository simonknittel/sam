import { RoleAssignmentChangeType } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { CitizenErrorMessage } from "../spynet/citizenErrors.js";
import { withSpan } from "../withSpan.js";
import { canAssignRole, canDismissRole } from "./roleAssignmentPermissions.js";
import { createRoleAssignmentChanges } from "./roleAssignmentWrites.js";
import { RoleAssignmentErrorMessage } from "./roleErrors.js";
import { MAXIMUM_ROLE_RELATIONS } from "./roleInputSchemas.js";

export const updateRoleAssignmentsInputSchema = z.object({
  citizen_id: idSchema,
  role_ids: z
    .array(idSchema)
    .max(MAXIMUM_ROLE_RELATIONS)
    .describe(
      "All roles that the citizen has after the change. Each role that is not in the list is removed.",
    ),
});

export type UpdateRoleAssignmentsInput = z.infer<
  typeof updateRoleAssignmentsInputSchema
>;

export interface RoleAssignmentUpdate {
  readonly role_id: string;
  /** True: the citizen got the role. False: the citizen lost it. */
  readonly enabled: boolean;
}

export interface UpdateRoleAssignmentsOutput {
  readonly citizen_id: string;
  /** Empty when nothing changed */
  readonly changes: RoleAssignmentUpdate[];
}

/**
 * Gives the roles of the list to a citizen and removes all other roles.
 * Requires a citizen. A change that the actor may not make (see
 * `canAssignRole()` and `canDismissRole()`) is left out without an error.
 * The citizen gets a notification for each added role, except when the
 * citizen is the actor.
 *
 * @throws NotFoundError when the citizen does not exist
 * @throws ConflictError when the citizen is deleted
 */
export const updateRoleAssignments = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateRoleAssignmentsInput,
): Promise<UpdateRoleAssignmentsOutput> =>
  withSpan(context, "updateRoleAssignments", async () => {
    const actorCitizen = requireCitizen(actor);

    const [citizen, allRoles, currentAssignments] = await Promise.all([
      context.prisma.citizen.findUnique({
        where: { id: input.citizen_id },
        select: { deletedAt: true },
      }),
      context.prisma.role.findMany({ select: { id: true } }),
      context.prisma.roleAssignment.findMany({
        where: { citizenId: input.citizen_id },
        select: { roleId: true },
      }),
    ]);
    if (!citizen) throw new NotFoundError(CitizenErrorMessage.NotFound);
    if (citizen.deletedAt)
      throw new ConflictError(RoleAssignmentErrorMessage.CitizenDeleted);

    const selectedRoleIds = new Set(input.role_ids);
    const assignedRoleIds = new Set(
      currentAssignments.map((assignment) => assignment.roleId),
    );

    const changes = allRoles.flatMap((role): RoleAssignmentUpdate[] => {
      const enabled = selectedRoleIds.has(role.id);
      if (enabled === assignedRoleIds.has(role.id)) return [];

      const isPermitted = enabled
        ? canAssignRole(actor, role.id)
        : canDismissRole(actor, role.id);

      return isPermitted ? [{ role_id: role.id, enabled }] : [];
    });

    if (changes.length > 0) {
      /**
       * The history rows are in the same transaction, thus a failed change
       * writes no history
       */
      await context.prisma.$transaction([
        ...changes.map((change) =>
          change.enabled
            ? context.prisma.roleAssignment.create({
                data: { citizenId: input.citizen_id, roleId: change.role_id },
                select: { id: true },
              })
            : context.prisma.roleAssignment.delete({
                where: {
                  citizenId_roleId: {
                    citizenId: input.citizen_id,
                    roleId: change.role_id,
                  },
                },
                select: { id: true },
              }),
        ),
        createRoleAssignmentChanges(
          context.prisma,
          changes.map((change) => ({
            citizenId: input.citizen_id,
            roleId: change.role_id,
            type: change.enabled
              ? RoleAssignmentChangeType.ADD
              : RoleAssignmentChangeType.REMOVE,
          })),
          actorCitizen.id,
        ),
      ]);

      await context.audit.create([
        {
          type: AuditEventType.ROLE_ASSIGNMENTS_UPDATED,
          data: {
            citizenId: input.citizen_id,
            changes: changes.map((change) => ({
              roleId: change.role_id,
              enabled: change.enabled,
            })),
          },
          createdById: actor.userId,
        },
      ]);
    }

    // The actor gets no notification about a role that the actor gave to
    // the own citizen
    const notifications =
      input.citizen_id === actorCitizen.id
        ? []
        : changes
            .filter((change) => change.enabled)
            .map((change) => ({
              type: "RoleAdded",
              payload: { citizenId: input.citizen_id, roleId: change.role_id },
            }));

    await triggerNotificationsAfterSave(context, notifications);

    return { citizen_id: input.citizen_id, changes };
  });
