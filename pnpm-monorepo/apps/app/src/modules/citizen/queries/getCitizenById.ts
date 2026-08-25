import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Entity["id"]) => {
    /**
     * The identity columns hold the content of the latest confirmed log entry
     * of their type. The overview shows them; their history stays behind the
     * history modal, which reads the logs with its own query.
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
        teamspeakId: true,
        citizenId: true,
        communityMoniker: true,
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
