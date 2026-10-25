import { ReadMarkerSubject } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { markAnnouncementsAsRead } from "./announcements.js";
import {
  markReadableItemsAsRead,
  readMarkerSubjectIdSchema,
} from "./writeReadMarkers.js";

/**
 * The read-on-view tracking of the changelog page sends the keys of the
 * viewed entries in small batches. The limit bounds one write.
 */
const MAXIMUM_ITEMS_PER_READ = 100;

export const markItemsAsReadInputSchema = z.object({
  subject: z.enum(ReadMarkerSubject),
  subject_ids: z
    .array(readMarkerSubjectIdSchema)
    .min(1)
    .max(MAXIMUM_ITEMS_PER_READ),
});

export type MarkItemsAsReadInput = z.output<typeof markItemsAsReadInputSchema>;

export interface MarkItemsAsReadOutput {
  /** The number of the items which were new for the actor before this call */
  readonly new_count: number;
  /**
   * The number of the unread notifications which announced the items and
   * which are read now
   */
  readonly notifications_read: number;
}

/**
 * Marks a batch of items of one subject type as read by the actor, for
 * example the changelog entries that dwelled in view. Also marks the
 * notifications which announced the items as read. Skips the items which do
 * not exist or which the actor cannot see. Repeated calls change nothing.
 *
 * @throws ForbiddenError for a user without a citizen
 */
export const markItemsAsRead = (
  context: ApplicationContext,
  actor: Actor,
  input: MarkItemsAsReadInput,
): Promise<MarkItemsAsReadOutput> =>
  withSpan(context, "markItemsAsRead", async () => {
    const { readableItems, newItems } = await markReadableItemsAsRead(
      context,
      actor,
      input.subject_ids.map((subjectId) => ({
        subject: input.subject,
        subjectId,
      })),
    );

    const notificationsRead = await markAnnouncementsAsRead(
      context,
      actor,
      readableItems,
    );

    return {
      new_count: newItems.length,
      notifications_read: notificationsRead,
    };
  });
