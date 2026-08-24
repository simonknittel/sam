import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { canViewVariantPages } from "../utils/canViewVariantPages";

export const getVariantDetail = cache(
  withTrace(
    "getVariantDetail",
    async (variantId: string, requireOtherShipsRead = false) => {
      const authentication = await requireAuthentication();

      if (!(await canViewVariantPages(authentication))) forbidden();

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
                  image: { select: { id: true, mimeType: true } },
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
