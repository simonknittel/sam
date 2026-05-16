import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getMyFleetVariantTags = cache(
  withTrace("getMyFleetVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    const ships = await prisma.ship.findMany({
      where: {
        ownerId: authentication.session.user.id,
        deletedAt: null,
      },
      select: {
        variantId: true,
      },
    });

    const variantIds = [...new Set(ships.map((s) => s.variantId))];

    if (variantIds.length === 0) return [];

    const tags = await prisma.variantTag.findMany({
      where: {
        variants: {
          some: {
            id: {
              in: variantIds,
            },
          },
        },
      },
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });

    return tags;
  }),
);
