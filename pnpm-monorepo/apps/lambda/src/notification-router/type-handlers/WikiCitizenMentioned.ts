import {
  findWikiCitizenMentionedRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type WikiPageCitizenMention } from "@sam-monorepo/database";
import { getWikiCitizenMentionedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  mentionId: WikiPageCitizenMention["id"];
}

/**
 * Sends the notification for one pending mention link (see
 * `findWikiCitizenMentionedRecipient()` for the recipient)
 */
export const WikiCitizenMentionedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findWikiCitizenMentionedRecipient(context, {
    mentionId: payload.mentionId,
  });
  if (!result) return;

  const { mention } = result;
  const notificationPayload = {
    pageId: mention.pageId,
    pageTitle: mention.pageTitle,
    // The text shows this value, thus it holds the label of a deleted
    // citizen.
    mentionedByHandle: mention.mentionedByName,
    eventId: mention.eventId,
  };
  const text = getWikiCitizenMentionedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "wiki_citizen_mentioned" as const,
      payload: notificationPayload,
      ...text,
      url: mention.eventId
        ? `/app/events/${mention.eventId}/briefing/${mention.pageId}`
        : `/app/wiki/${mention.pageId}`,
    })),
  );
};
