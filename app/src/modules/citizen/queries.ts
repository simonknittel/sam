import { prisma } from "@/db";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity, Role, Upload } from "@prisma/client";
import { cache } from "react";

export const getCitizens = withTrace("getCitizens", async () => {
  return prisma.entity.findMany({
    include: {
      roleAssignments: true,
    },
  });
});

export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Entity["id"]) => {
    return prisma.entity.findUnique({
      where: {
        id,
      },
      include: {
        roleAssignments: true,
      },
    });
  }),
);

export const getCitizenByDiscordId = cache(
  withTrace("getCitizenByDiscordId", async (discordId: string) => {
    return prisma.entity.findUnique({
      where: {
        discordId, // TODO: Respect history
      },
    });
  }),
);

export const getCitizensGroupedByVisibleRoles = cache(
  withTrace("getCitizensGroupedByVisibleRoles", async () => {
    const citizens = await prisma.entity.findMany({
      where: {
        roles: {
          not: null,
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
        role: Role & {
          icon: Upload | null;
        };
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
