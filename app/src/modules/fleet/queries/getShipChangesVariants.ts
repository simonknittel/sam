import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getShipChangesVariants = cache(
  withTrace("getShipChangesVariants", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    return prisma.variant.findMany({
      select: {
        id: true,
        name: true,
        series: {
          select: {
            name: true,
            manufacturer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
);
