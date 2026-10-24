import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  isCatalogPermissionString,
  isPermissionRule,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  NotFoundError,
  rethrowRecordNotFound,
  ValidationError,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleErrorMessage } from "./roleErrors.js";
import {
  MAXIMUM_ROLE_RELATIONS,
  permissionStringSchema,
} from "./roleInputSchemas.js";

export const changeRolePermissionsInputSchema = z.object({
  role_id: idSchema,
  add: z
    .array(permissionStringSchema)
    .max(MAXIMUM_ROLE_RELATIONS)
    .default([])
    .describe(
      "The permission strings that the role gets: strings of the permission catalog or rules.",
    ),
  remove: z
    .array(permissionStringSchema)
    .max(MAXIMUM_ROLE_RELATIONS)
    .default([])
    .describe("The permission strings that the role loses."),
});

export type ChangeRolePermissionsInput = z.output<
  typeof changeRolePermissionsInputSchema
>;

export interface ChangeRolePermissionsOutput {
  readonly role_id: string;
  /** All permission strings of the role after the change, sorted */
  readonly permission_strings: string[];
  /** Sorted. Only the strings that the role did not have before. */
  readonly added: string[];
  /** Sorted. Only the strings that the role had before. */
  readonly removed: string[];
}

const PERMISSION_STRINGS_SELECT = {
  permissionStrings: {
    select: { permissionString: true },
    orderBy: { permissionString: "asc" },
  },
} as const satisfies Prisma.RoleSelect;

const toPermissionStrings = (role: {
  readonly permissionStrings: readonly { readonly permissionString: string }[];
}) =>
  role.permissionStrings.map(
    (permissionString) => permissionString.permissionString,
  );

/**
 * Adds permission strings to a role and removes permission strings from it.
 * The other permission strings of the role stay. Requires `role;manage`.
 * Each string that changes gets its own audit event, like a cell of the
 * permission matrix.
 *
 * Only the strings that the role page can give can be added: the strings of
 * `PERMISSION_CATALOG` and the rules of `isPermissionRule()`. Each string can
 * be removed, also a string that the catalog does not have any more.
 *
 * @throws ValidationError when a permission string is in `add` and in
 * `remove`, or when the role page cannot give a string of `add`
 * @throws NotFoundError when the role does not exist
 */
export const changeRolePermissions = (
  context: ApplicationContext,
  actor: Actor,
  input: ChangeRolePermissionsInput,
): Promise<ChangeRolePermissionsOutput> =>
  withSpan(context, "changeRolePermissions", async () => {
    requirePermission(actor, "role", "manage");

    const removals = new Set(input.remove);
    if (input.add.some((permissionString) => removals.has(permissionString)))
      throw new ValidationError(
        RoleErrorMessage.PermissionStringAddedAndRemoved,
      );
    if (
      input.add.some(
        (permissionString) =>
          !isCatalogPermissionString(permissionString) &&
          !isPermissionRule(permissionString),
      )
    )
      throw new ValidationError(RoleErrorMessage.UnknownPermissionString);

    const role = await context.prisma.role.findUnique({
      where: { id: input.role_id },
      select: PERMISSION_STRINGS_SELECT,
    });
    if (!role) throw new NotFoundError(RoleErrorMessage.NotFound);

    const currentPermissionStrings = toPermissionStrings(role);
    const current = new Set(currentPermissionStrings);
    const added = [...new Set(input.add)]
      .filter((permissionString) => !current.has(permissionString))
      .toSorted();
    const removed = [...removals]
      .filter((permissionString) => current.has(permissionString))
      .toSorted();

    if (added.length <= 0 && removed.length <= 0)
      return {
        role_id: input.role_id,
        permission_strings: currentPermissionStrings,
        added,
        removed,
      };

    const updatedRole = await rethrowRecordNotFound(
      () =>
        context.prisma.role.update({
          where: { id: input.role_id },
          data: {
            permissionStrings: {
              deleteMany: { permissionString: { in: removed } },
              createMany: {
                data: added.map((permissionString) => ({ permissionString })),
                // A different user can add the same string at the same time
                skipDuplicates: true,
              },
            },
          },
          select: PERMISSION_STRINGS_SELECT,
        }),
      RoleErrorMessage.NotFound,
    );

    const changes = [
      ...added.map((permissionString) => ({ permissionString, enabled: true })),
      ...removed.map((permissionString) => ({
        permissionString,
        enabled: false,
      })),
    ];
    await context.audit.create(
      changes.map(({ permissionString, enabled }) => ({
        type: AuditEventType.ROLE_PERMISSION_TOGGLED,
        data: { roleId: input.role_id, permissionString, enabled },
        createdById: actor.userId,
      })),
    );

    return {
      role_id: input.role_id,
      permission_strings: toPermissionStrings(updatedRole),
      added,
      removed,
    };
  });
