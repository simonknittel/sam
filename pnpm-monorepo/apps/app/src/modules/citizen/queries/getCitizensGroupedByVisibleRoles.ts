import { prisma } from "@/db";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCitizensGroupedByVisibleRoles = cache(
  withTrace("getCitizensGroupedByVisibleRoles", async () => {
    const citizens = await prisma.entity.findMany({
      where: {
        roleAssignments: {
          some: {},
        },
      },
      orderBy: {
        handle: "asc",
      },
      include: {
        roleAssignments: true,
      },
    });

    const visibleRoles = await getVisibleRoles();

    const groupedCitizens = new Map<
      string,
      {
        role: BadgeRole;
        citizens: Entity[];
      }
    >();

    for (const citizen of citizens) {
      for (const citizenRoleId of citizen.roleAssignments.map(
        (assignment) => assignment.roleId,
      )) {
        const role = visibleRoles.find((r) => r.id === citizenRoleId);

        if (role) {
          if (!groupedCitizens.has(role.id)) {
            groupedCitizens.set(role.id, { role, citizens: [] });
          }

          groupedCitizens.get(role.id)?.citizens.push(citizen);
        }
      }
    }

    return groupedCitizens;
  }),
);
