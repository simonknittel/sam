import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { RoleErrorMessage } from "./roleErrors.js";
import {
  ROLE_OUTPUT_SELECT,
  toRoleOutput,
  type RoleOutput,
} from "./roleOutput.js";
import { isRoleVisible } from "./roleVisibility.js";

export const getRoleInputSchema = z.object({
  role_id: idSchema,
});

export type GetRoleInput = z.output<typeof getRoleInputSchema>;

export interface GetRoleOutput extends RoleOutput {
  /** Null also without `role;manage` */
  readonly max_age_days: number | null;
  /** Null also without `role;manage` */
  readonly assign_after_inactive_days: number | null;
  /** Null without `role;manage` */
  readonly permission_strings: string[] | null;
}

export const getRole = async (
  context: ApplicationContext,
  actor: Actor,
  input: GetRoleInput,
): Promise<GetRoleOutput> => {
  if (!isRoleVisible(actor, input.role_id))
    throw new NotFoundError(RoleErrorMessage.NotFound);

  const role = await context.prisma.role.findUnique({
    where: { id: input.role_id },
    select: {
      ...ROLE_OUTPUT_SELECT,
      maxAgeDays: true,
      assignAfterInactiveDays: true,
      permissionStrings: {
        select: { permissionString: true },
        orderBy: { permissionString: "asc" },
      },
    },
  });
  if (!role) throw new NotFoundError(RoleErrorMessage.NotFound);

  const canManageRoles = actor.authorize("role", "manage");

  return {
    ...toRoleOutput(context, actor, role),
    max_age_days: canManageRoles ? role.maxAgeDays : null,
    assign_after_inactive_days: canManageRoles
      ? role.assignAfterInactiveDays
      : null,
    permission_strings: canManageRoles
      ? role.permissionStrings.map(
          (permissionString) => permissionString.permissionString,
        )
      : null,
  };
};
