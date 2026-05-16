import { prisma } from "@/db";
import type { Entity } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { getAssignableRoles } from "@/modules/roles/utils/getRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getCitizenPopoverById = cache(
  withTrace("getCitizenPopoverById", async (id: Entity["id"]) => {
    const authentication = await requireAuthentication();
    await authentication.authorize("citizen", "read");

    const [citizen, assignableRoles] = await Promise.all([
      prisma.entity.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          handle: true,
          roleAssignments: {
            select: {
              roleId: true,
              citizenId: true,
              currentLevel: true,
            },
          },
        },
      }),

      getAssignableRoles(),
    ]);

    if (!citizen) return null;

    const canUpdateAnyRoleAssignment = Boolean(assignableRoles.length);

    return {
      citizen,
      canUpdateAnyRoleAssignment,
    };
  }),
);
