import { prisma } from "@sam-monorepo/database";
import {
  WikiPageEventScope,
  WikiPageNamespace,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";

/**
 * Data for an event wiki's locked root "Briefing" page: the wiki's homepage
 * and gate (events without one have no Briefing tab). Title and slug are
 * constants because the root page can never be renamed. MANAGERS scopes keep
 * the tab hidden until the organizer deliberately publishes it. The organizer
 * becomes the page's owner; if no citizen matches their Discord id, the page
 * starts without an owner.
 */
export const buildBriefingRootPageData = async (
  discordCreatorId: string | null,
) => {
  const organizer = discordCreatorId
    ? await prisma.entity.findUnique({
        where: {
          discordId: discordCreatorId,
        },
        select: {
          id: true,
        },
      })
    : null;

  return {
    namespace: WikiPageNamespace.EVENT,
    title: "BRIEFING",
    slug: "briefing",
    eventReadScope: WikiPageEventScope.MANAGERS,
    eventEditScope: WikiPageEventScope.MANAGERS,
    imageUploadability: WikiPageUploadability.RESTRICTED,
    attachmentUploadability: WikiPageUploadability.RESTRICTED,
    ownerId: organizer?.id ?? null,
  };
};
