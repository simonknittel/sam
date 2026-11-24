import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { deletePermissionStringsReferencing } from "./deletePermissionStringsReferencing.js";
import { RoleErrorMessage } from "./roleErrors.js";

export const deleteRoleInputSchema = z.object({
  role_id: idSchema,
});

export type DeleteRoleInput = z.infer<typeof deleteRoleInputSchema>;

export interface DeleteRoleOutput {
  readonly id: string;
  readonly name: string;
}

export const deleteRole = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteRoleInput,
): Promise<DeleteRoleOutput> =>
  withSpan(context, "deleteRole", async () => {
    requirePermission(actor, "role", "manage");

    const role = await context.prisma.role.findUnique({
      where: { id: input.role_id },
      select: { id: true, name: true },
    });
    if (!role) throw new NotFoundError(RoleErrorMessage.NotFound);

    await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction([
          context.prisma.role.delete({ where: { id: role.id } }),
          deletePermissionStringsReferencing(context.prisma, "roleId", role.id),
        ]),
      RoleErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_DELETED,
        data: { roleId: role.id, name: role.name },
        createdById: actor.userId,
      },
    ]);

    return role;
  });
