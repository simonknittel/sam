import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getVariantDetail = cache(
  withTrace(
    "getVariantDetail",
    async (variantId: string, requireOtherShipsRead: boolean = false) => {
      const authentication = await requireAuthentication();

      const hasShipManage = await authentication.authorize("ship", "manage");
      const hasOrgFleetRead = await authentication.authorize(
        "orgFleet",
        "read",
      );

      if (!hasShipManage && !hasOrgFleetRead) forbidden();

      if (requireOtherShipsRead) {
        const hasOtherShipsRead = await authentication.authorize(
          "otherShips",
          "read",
        );
        if (!hasOtherShipsRead) forbidden();
      }

      return prisma.variant.findUnique({
        where: { id: variantId },
        include: {
          series: {
            include: {
              manufacturer: {
                include: {
                  image: true,
                },
              },
            },
          },
          tags: true,
          externalLinks: true,
          _count: {
            select: {
              ships: true,
            },
          },
        },
      });
    },
  ),
);
