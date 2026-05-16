import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getRoleSalaries = cache(
  withTrace("getRoleSalaries", async () => {
    return prisma.silcRoleSalary.findMany();
  }),
);
