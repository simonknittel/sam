import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Entity["id"]) => {
    /**
     * The citizen's identity columns other than these are not read from the
     * entity: the overview renders each of them from its log history
     * instead, through its own query.
     */
    return prisma.entity.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        handle: true,
        spectrumId: true,
        discordId: true,
        timezone: true,
        birthdayDay: true,
        birthdayMonth: true,
        roleAssignments: {
          select: {
            roleId: true,
            currentLevel: true,
          },
        },
      },
    });
  }),
);
