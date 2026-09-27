import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { buildRequiredVariantShipWhere } from "./eventRelationSelects";

/**
 * The ships of the signed-in citizen that the requirement check of the
 * lineup needs, see `buildRequiredVariantShipWhere()`
 */
export const getMyShipsOfRequiredVariants = cache(
  withTrace("getMyShipsOfRequiredVariants", async (eventId: Event["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    const citizenId = authentication.session.entity?.id;
    if (!citizenId) return [];

    return prisma.ship.findMany({
      where: {
        ...buildRequiredVariantShipWhere(eventId),
        ownerId: citizenId,
      },
      select: {
        variantId: true,
      },
    });
  }),
);
