import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity, RoleAssignment } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getRoles } from "../queries";

export const getVisibleRoles = cache(
  withTrace("getVisibleRoles", async () => {
    const authentication = await requireAuthentication();

    const allRoles = await getRoles();
    // TODO: Filter `inherits` as well
    const visibleRoles = (
      await Promise.all(
        allRoles.map(async (role) => {
          return {
            role,
            include: await authentication.authorize("otherRole", "read", [
              {
                key: "roleId",
                value: role.id,
              },
            ]),
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ role }) => role)
      .sort((a, b) => a.name.localeCompare(b.name));

    return visibleRoles;
  }),
);

export const getAssignedRoles = cache(
  async (
    entity: Entity & {
      roleAssignments: RoleAssignment[];
    },
  ) => {
    const visibleRoles = await getVisibleRoles();

    const assignedRoles = visibleRoles.filter((role) =>
      entity.roleAssignments.some(
        (assignment) => assignment.roleId === role.id,
      ),
    );

    return assignedRoles;
  },
);

export const getMyAssignedRoles = cache(
  withTrace("getMyAssignedRoles", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();

    return getAssignedRoles(authentication.session.entity);
  }),
);

export const getAssignableRoles = cache(
  withTrace("getAssignableRoles", async () => {
    const [authentication, allRoles] = await Promise.all([
      requireAuthentication(),
      getVisibleRoles(),
    ]);

    const assignableRoles = (
      await Promise.all(
        allRoles.map(async (role) => {
          const include =
            (await authentication.authorize("otherRole", "assign", [
              {
                key: "roleId",
                value: role.id,
              },
            ])) ||
            (await authentication.authorize("otherRole", "dismiss", [
              {
                key: "roleId",
                value: role.id,
              },
            ]));

          return {
            role,
            include,
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ role }) => role)
      .sort((a, b) => a.name.localeCompare(b.name));

    return assignableRoles;
  }),
);
