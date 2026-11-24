import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import {
  createWikiMentionReadGate,
  PENDING_WIKI_MENTION_SELECT,
  type PendingWikiMention,
} from "./wikiMentionReadGate.js";

/**
 * Limits the work of one run to stay in the time limit of the Lambda
 * function (90 seconds). The next run, 15 minutes later, handles the
 * pending mentions that remain.
 */
const MAXIMUM_MENTIONS_PER_RUN = 200;

export interface NotifyWikiCitizenMentionsOutput {
  readonly pendingMentionCount: number;
  /**
   * The mentions that passed the gate. They stay pending when
   * `notificationsSent` is false.
   */
  readonly notifiedMentionCount: number;
  readonly suppressedMentionCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Turns the pending mention links (written by the collab server) into
 * notification requests, throttled to the 15-minute schedule of this
 * automation. A mention that a user removed before the run has no row, thus
 * nothing fires.
 *
 * The run checks each mention at send time: the mentioned citizen must be
 * able to log in and read the page now. A mention that fails the check, a
 * self-mention and a mention on a page in the trash are suppressed for
 * good, not tried again. The other mentions get a notification request. The
 * run marks them as notified only after the request succeeded, thus a
 * failed request keeps them pending for the next run. A crash between the
 * request and the mark can send a notification twice, but never loses one.
 */
export const notifyWikiCitizenMentions = (
  context: ApplicationContext,
): Promise<NotifyWikiCitizenMentionsOutput> =>
  withSpan(context, "notifyWikiCitizenMentions", async () => {
    const now = context.now();
    const pending = await context.prisma.wikiPageCitizenMention.findMany({
      where: { notifiedAt: null, suppressedAt: null },
      orderBy: { createdAt: "asc" },
      take: MAXIMUM_MENTIONS_PER_RUN,
      select: PENDING_WIKI_MENTION_SELECT,
    });
    if (pending.length <= 0) {
      return {
        pendingMentionCount: 0,
        notifiedMentionCount: 0,
        suppressedMentionCount: 0,
        notificationsSent: true,
      };
    }

    const mayRead = await createWikiMentionReadGate(context, pending);

    const notifiable: PendingWikiMention[] = [];
    const suppressed: PendingWikiMention[] = [];
    for (const mention of pending) {
      /**
       * The collab server suppresses self-mentions when it saves them. This
       * check is a second safeguard.
       */
      const isSelfMention = mention.citizenId === mention.createdById;

      if (mention.page.deletedAt || isSelfMention || !mayRead(mention)) {
        suppressed.push(mention);
      } else {
        notifiable.push(mention);
      }
    }

    await context.audit.create([
      {
        type: AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT,
        data: {
          notifiedCount: notifiable.length,
          suppressedCount: suppressed.length,
        },
        createdById: null,
      },
    ]);

    if (suppressed.length > 0) {
      await context.prisma.wikiPageCitizenMention.updateMany({
        where: { id: { in: suppressed.map((mention) => mention.id) } },
        data: { suppressedAt: now },
      });
    }

    let notificationsSent = true;
    if (notifiable.length > 0) {
      notificationsSent = await triggerNotificationsAfterSave(
        context,
        notifiable.map((mention) => ({
          type: "WikiCitizenMentioned",
          payload: { mentionId: mention.id },
        })),
      );

      if (notificationsSent) {
        await context.prisma.wikiPageCitizenMention.updateMany({
          where: { id: { in: notifiable.map((mention) => mention.id) } },
          data: { notifiedAt: now },
        });
      }
    }

    return {
      pendingMentionCount: pending.length,
      notifiedMentionCount: notifiable.length,
      suppressedMentionCount: suppressed.length,
      notificationsSent,
    };
  });
