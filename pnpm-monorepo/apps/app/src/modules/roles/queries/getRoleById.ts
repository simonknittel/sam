import { prisma } from "@/db";
import type { Role } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * Use the methods from `getRoles.ts` preferably for correct permission management.
 */
export const getRoleById = cache(
  withTrace("getRoleById", async (id: Role["id"]) => {
    return prisma.role.findUnique({
      where: {
        id,
      },
      include: {
        permissionStrings: true,
        inherits: true,
        icon: true,
        thumbnail: true,
      },
    });
  }),
);
