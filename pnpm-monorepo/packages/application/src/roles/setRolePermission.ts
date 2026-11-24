import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";
import { permissionStringSchema } from "./roleInputSchemas.js";

export const setRolePermissionInputSchema = z.object({
  role_id: idSchema,
  permission_string: permissionStringSchema,
  enabled: z
    .boolean()
    .describe(
      "True: the role gets the permission string. False: the role loses it.",
    ),
});

export type SetRolePermissionInput = z.infer<
  typeof setRolePermissionInputSchema
>;

export interface SetRolePermissionOutput {
  readonly role_id: string;
  readonly permission_string: string;
  readonly enabled: boolean;
}

export const setRolePermission = (
  context: ApplicationContext,
  actor: Actor,
  input: SetRolePermissionInput,
): Promise<SetRolePermissionOutput> =>
  withSpan(context, "setRolePermission", async () => {
    requirePermission(actor, "role", "manage");

    await rethrowRecordNotFound(
      () =>
        context.prisma.role.update({
          where: { id: input.role_id },
          data: {
            permissionStrings: input.enabled
              ? {
                  createMany: {
                    data: { permissionString: input.permission_string },
                    // A double click or a second admin must not create a duplicate
                    skipDuplicates: true,
                  },
                }
              : {
                  deleteMany: { permissionString: input.permission_string },
                },
          },
          select: { id: true },
        }),
      RoleErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.ROLE_PERMISSION_TOGGLED,
        data: {
          roleId: input.role_id,
          permissionString: input.permission_string,
          enabled: input.enabled,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      role_id: input.role_id,
      permission_string: input.permission_string,
      enabled: input.enabled,
    };
  });
