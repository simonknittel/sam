import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowUniqueConstraintFailed } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";
import { roleNameSchema } from "./roleInputSchemas.js";

export const createRoleInputSchema = z.object({
  name: roleNameSchema.describe(
    "The name of the new role. Each role has a different name.",
  ),
});

export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

export interface CreateRoleOutput {
  readonly id: string;
  readonly name: string;
}

export const createRole = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateRoleInput,
): Promise<CreateRoleOutput> =>
  withSpan(context, "createRole", async () => {
    requirePermission(actor, "role", "manage");

    const role = await rethrowUniqueConstraintFailed(
      () =>
        context.prisma.role.create({
          data: { name: input.name },
          select: { id: true, name: true },
        }),
      RoleErrorMessage.NameTaken,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_CREATED,
        data: { roleId: role.id, name: role.name },
        createdById: actor.userId,
      },
    ]);

    return role;
  });
