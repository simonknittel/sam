import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Role } from "@prisma/client";
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

/**
 * Use the methods from `getRoles.ts` preferably for correct permission management.
 */
export const getRoles = cache(
  withTrace("getRoles", async (withPermissionStrings = false) => {
    return prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        permissionStrings: withPermissionStrings as boolean,
        inherits: true,
        icon: true,
        thumbnail: true,
        assignments: {
          select: {
            id: true,
          },
        },
      },
    });
  }),
);
