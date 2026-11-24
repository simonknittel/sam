import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";
import {
  MAXIMUM_ROLE_RELATIONS,
  permissionStringSchema,
} from "./roleInputSchemas.js";

export const updateRolePermissionsInputSchema = z.object({
  role_id: idSchema,
  permission_strings: z
    .array(permissionStringSchema)
    .max(MAXIMUM_ROLE_RELATIONS)
    .describe(
      "All permission strings of the role after the change. The list replaces the permission strings.",
    ),
});

export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsInputSchema
>;

export interface UpdateRolePermissionsOutput {
  readonly id: string;
  readonly permission_strings: string[];
}

export const updateRolePermissions = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateRolePermissionsInput,
): Promise<UpdateRolePermissionsOutput> =>
  withSpan(context, "updateRolePermissions", async () => {
    requirePermission(actor, "role", "manage");

    const role = await rethrowRecordNotFound(
      () =>
        context.prisma.role.update({
          where: { id: input.role_id },
          data: {
            permissionStrings: {
              deleteMany: {},
              createMany: {
                data: input.permission_strings.map((permissionString) => ({
                  permissionString,
                })),
                skipDuplicates: true,
              },
            },
          },
          select: {
            id: true,
            permissionStrings: {
              select: { permissionString: true },
              orderBy: { permissionString: "asc" },
            },
          },
        }),
      RoleErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
        data: { roleId: role.id },
        createdById: actor.userId,
      },
    ]);

    return {
      id: role.id,
      permission_strings: role.permissionStrings.map(
        (permissionString) => permissionString.permissionString,
      ),
    };
  });
