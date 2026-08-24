import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Entity["id"]) => {
    return prisma.entity.findUnique({
      where: {
        id,
      },
      include: {
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
