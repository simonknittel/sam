import { prisma } from "@/db";
import type { Entity } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

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
