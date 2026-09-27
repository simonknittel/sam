import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Citizen } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Citizen["id"]) => {
    /**
     * The identity columns hold the content of the latest confirmed log entry
     * of their type. The overview shows them; their history stays behind the
     * history modal, which reads the logs with its own query.
     */
    return prisma.citizen.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        handle: true,
        spectrumId: true,
        discordId: true,
        teamspeakId: true,
        citizenRecord: true,
        userId: true,
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
