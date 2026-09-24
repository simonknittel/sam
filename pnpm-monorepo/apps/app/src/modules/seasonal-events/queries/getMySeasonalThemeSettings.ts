import "server-only";

import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * The opt-out rows of the viewer. A row means the citizen switched the
 * event off; an event without a row is switched on. A viewer without a
 * citizen has no rows and cannot create any, thus the query answers with
 * nothing.
 */
export const getMySeasonalThemeSettings = cache(
  withTrace("getMySeasonalThemeSettings", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) return null;

    return prisma.seasonalThemeSetting.findMany({
      where: {
        citizenId: authentication.session.entity.id,
      },
    });
  }),
);
