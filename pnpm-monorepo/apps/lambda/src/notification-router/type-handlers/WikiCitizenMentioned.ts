import { prisma, type WikiPageCitizenMention } from "@sam-monorepo/database";
import { publishNotifications } from "../publish";

interface Payload {
  mentionId: WikiPageCitizenMention["id"];
}

/**
 * Sends the notification for one pending mention link. The
 * wikiCitizenMentioned automation has already read-permission-gated the
 * mention; this handler only resolves the display data and publishes. A
 * row deleted in the meantime means the mention was removed — nothing to
 * send.
 */
export const WikiCitizenMentionedHandler = async (payload: Payload) => {
  const mention = await prisma.wikiPageCitizenMention.findUnique({
    where: { id: payload.mentionId },
    select: {
      citizenId: true,
      createdBy: { select: { handle: true } },
      page: {
        select: { id: true, title: true, eventId: true, deletedAt: true },
      },
    },
  });
  if (!mention || mention.page.deletedAt) return;

  const mentionedByHandle = mention.createdBy?.handle ?? null;

  await publishNotifications([
    {
      receiverId: mention.citizenId,
      notificationType: "wiki_citizen_mentioned" as const,
      payload: {
        pageId: mention.page.id,
        pageTitle: mention.page.title,
        mentionedByHandle,
        eventId: mention.page.eventId,
      },
      title: "Du wurdest im Wiki erwähnt",
      body: mentionedByHandle
        ? `${mentionedByHandle} hat dich auf der Seite "${mention.page.title}" erwähnt`
        : `Du wurdest auf der Seite "${mention.page.title}" erwähnt`,
      url: mention.page.eventId
        ? `/app/events/${mention.page.eventId}/briefing/${mention.page.id}`
        : `/app/wiki/${mention.page.id}`,
    },
  ]);
};
