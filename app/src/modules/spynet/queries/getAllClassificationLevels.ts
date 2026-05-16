import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getAllClassificationLevels = cache(
  withTrace("getAllClassificationLevels", async () => {
    return prisma.classificationLevel.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }),
);
