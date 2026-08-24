import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Role } from "@sam-monorepo/database/client";
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
        permissionStrings: { select: { permissionString: true } },
        inherits: { select: { id: true } },
        icon: { select: { id: true, mimeType: true } },
        thumbnail: { select: { id: true, mimeType: true } },
      },
    });
  }),
);
