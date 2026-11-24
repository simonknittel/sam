import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";

/**
 * Without a refine for the self-inheritance: Zod cannot extend a refined
 * object, and the app extends the schema for its form field
 */
export const setRoleInheritanceInputSchema = z.object({
  role_id: idSchema,
  inherited_role_id: idSchema,
  enabled: z
    .boolean()
    .describe(
      "True: the role gives the permissions of the inherited role. False: the role does not give them.",
    ),
});

export type SetRoleInheritanceInput = z.infer<
  typeof setRoleInheritanceInputSchema
>;

export interface SetRoleInheritanceOutput {
  readonly role_id: string;
  readonly inherited_role_id: string;
  readonly enabled: boolean;
}

export const setRoleInheritance = (
  context: ApplicationContext,
  actor: Actor,
  input: SetRoleInheritanceInput,
): Promise<SetRoleInheritanceOutput> =>
  withSpan(context, "setRoleInheritance", async () => {
    requirePermission(actor, "role", "manage");

    /**
     * The matrix has no checkbox on the diagonal, and the database rejects
     * the row. The check prevents an audit event for a write that cannot
     * happen.
     */
    if (input.role_id === input.inherited_role_id)
      throw new ValidationError(RoleErrorMessage.SelfInheritance);

    await rethrowRecordNotFound(
      () =>
        context.prisma.role.update({
          where: { id: input.role_id },
          data: {
            inherits: input.enabled
              ? { connect: { id: input.inherited_role_id } }
              : { disconnect: { id: input.inherited_role_id } },
          },
          select: { id: true },
        }),
      RoleErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_INHERITANCE_TOGGLED,
        data: {
          roleId: input.role_id,
          inheritedRoleId: input.inherited_role_id,
          enabled: input.enabled,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      role_id: input.role_id,
      inherited_role_id: input.inherited_role_id,
      enabled: input.enabled,
    };
  });
