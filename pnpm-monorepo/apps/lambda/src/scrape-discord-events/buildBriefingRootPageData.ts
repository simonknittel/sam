import { prisma } from "@sam-monorepo/database";
import {
  ACTIVE_CITIZEN_WHERE,
  buildBriefingRootPageSeed,
} from "@sam-monorepo/domain";

/**
 * Briefing root page data for a Discord-sourced event: the organizer becomes
 * the page's owner; if no citizen matches their Discord id, the page starts
 * without an owner. The page shape itself is shared with the app's
 * createEvent through `buildBriefingRootPageSeed`.
 */
export const buildBriefingRootPageData = async (
  discordCreatorId: string | null,
) => {
  const organizer = discordCreatorId
    ? await prisma.citizen.findFirst({
        where: {
          discordId: discordCreatorId,
          ...ACTIVE_CITIZEN_WHERE,
        },
        select: {
          id: true,
        },
      })
    : null;

  return buildBriefingRootPageSeed(organizer?.id ?? null);
};
