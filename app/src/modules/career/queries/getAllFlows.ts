import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getAllFlows = cache(
  withTrace("getAllFlows", async () => {
    return prisma.flow.findMany();
  }),
);
