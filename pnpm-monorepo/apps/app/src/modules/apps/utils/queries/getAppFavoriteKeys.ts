import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * Namespaced app keys the viewer marked as a favorite. Unfiltered — callers
 * resolve them against the apps they can actually see, so a key of an app that
 * disappeared or became redacted simply drops out of the lists while the row is
 * kept, in case the app returns.
 */
export const getAppFavoriteKeys = cache(
  withTrace("getAppFavoriteKeys", async (): Promise<Set<string>> => {
    const authentication = await authenticate();
    const citizenId = authentication ? authentication.session.entity?.id : null;
    if (!citizenId) return new Set();

    const favorites = await prisma.citizenAppFavorite.findMany({
      where: { citizenId },
      select: { appKey: true },
    });

    return new Set(favorites.map((favorite) => favorite.appKey));
  }),
);
