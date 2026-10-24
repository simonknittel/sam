import { getCitizenDisplayName } from "@sam-monorepo/domain";
import { CITIZEN_REFERENCE_SELECT } from "../../citizenReference.js";
import type { ApplicationContext } from "../../context.js";
import {
  createWikiMentionReadGate,
  PENDING_WIKI_MENTION_SELECT,
} from "../../wiki/wikiMentionReadGate.js";
import type { Recipient } from "./recipient.js";

export interface FindWikiCitizenMentionedRecipientInput {
  readonly mentionId: string;
}

export interface WikiCitizenMentionedRecipients {
  readonly mention: {
    readonly pageId: string;
    readonly pageTitle: string;
    readonly eventId: string | null;
    /** The display name, also the label of a deleted citizen */
    readonly mentionedByName: string | null;
  };
  readonly recipients: Recipient[];
}

/**
 * The mentioned citizen of one pending mention link, when the citizen can
 * read the page now. The wiki mention automation did the same read check
 * (`createWikiMentionReadGate()`), but the page and the roles can change
 * before the delivery. Null when the mention was removed in the meantime or
 * its page is in the trash.
 */
export const findWikiCitizenMentionedRecipient = async (
  context: ApplicationContext,
  input: FindWikiCitizenMentionedRecipientInput,
): Promise<WikiCitizenMentionedRecipients | null> => {
  const mention = await context.prisma.wikiPageCitizenMention.findUnique({
    where: { id: input.mentionId },
    select: {
      ...PENDING_WIKI_MENTION_SELECT,
      createdBy: { select: CITIZEN_REFERENCE_SELECT },
      page: {
        select: {
          ...PENDING_WIKI_MENTION_SELECT.page.select,
          id: true,
          title: true,
        },
      },
    },
  });
  if (!mention || mention.page.deletedAt) return null;

  const mayRead = await createWikiMentionReadGate(context, [mention]);

  return {
    mention: {
      pageId: mention.page.id,
      pageTitle: mention.page.title,
      eventId: mention.page.eventId,
      mentionedByName: mention.createdBy
        ? getCitizenDisplayName(mention.createdBy)
        : null,
    },
    recipients: mayRead(mention) ? [{ citizenId: mention.citizenId }] : [],
  };
};
