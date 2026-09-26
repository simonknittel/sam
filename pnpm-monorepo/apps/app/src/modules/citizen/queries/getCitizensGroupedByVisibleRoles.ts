import { prisma } from "@/db";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity, Role } from "@sam-monorepo/database/client";
import { cache } from "react";

interface CitizensGroupedByVisibleRoles {
  /** Each citizen who has at least one of the visible roles, by handle */
  readonly citizens: Pick<Entity, "id" | "handle">[];
  /**
   * One group for each visible role that has citizens, in the order of the
   * visible roles (by name). The groups refer to the citizens by id, because
   * superjson (tRPC) sends a citizen again for each group that refers to it.
   * The client gets the role itself from the roles context.
   */
  readonly roleGroups: {
    readonly roleId: Role["id"];
    readonly citizenIds: Entity["id"][];
  }[];
}

export const getCitizensGroupedByVisibleRoles = cache(
  withTrace(
    "getCitizensGroupedByVisibleRoles",
    async (): Promise<CitizensGroupedByVisibleRoles> => {
      const visibleRoles = await getVisibleRoles();
      const visibleRoleIds = visibleRoles.map((role) => role.id);

      const citizens = await prisma.entity.findMany({
        where: {
          roleAssignments: {
            some: {
              roleId: { in: visibleRoleIds },
            },
          },
        },
        orderBy: {
          handle: "asc",
        },
        select: {
          id: true,
          handle: true,
          roleAssignments: {
            where: {
              roleId: { in: visibleRoleIds },
            },
            select: {
              roleId: true,
            },
          },
        },
      });

      const citizenIdsByRoleId = new Map<Role["id"], Entity["id"][]>();
      for (const citizen of citizens) {
        for (const { roleId } of citizen.roleAssignments) {
          const citizenIds = citizenIdsByRoleId.get(roleId);

          if (citizenIds) {
            citizenIds.push(citizen.id);
          } else {
            citizenIdsByRoleId.set(roleId, [citizen.id]);
          }
        }
      }

      return {
        citizens: citizens.map(({ id, handle }) => ({ id, handle })),
        roleGroups: visibleRoles.flatMap((role) => {
          const citizenIds = citizenIdsByRoleId.get(role.id);
          return citizenIds ? [{ roleId: role.id, citizenIds }] : [];
        }),
      };
    },
  ),
);
