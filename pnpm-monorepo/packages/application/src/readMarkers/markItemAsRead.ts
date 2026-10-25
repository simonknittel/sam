import { ReadMarkerSubject } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { markAnnouncementsAsRead } from "./announcements.js";
import { ReadMarkerErrorMessage } from "./readMarkerErrors.js";
import { READ_MARKER_SUBJECT_RULES } from "./readMarkerSubjects.js";
import {
  auditCreatedReadMarkers,
  readMarkerSubjectIdSchema,
  writeReadMarkers,
} from "./writeReadMarkers.js";

export const markItemAsReadInputSchema = z.object({
  subject: z.enum(ReadMarkerSubject),
  subject_id: readMarkerSubjectIdSchema,
});

export type MarkItemAsReadInput = z.output<typeof markItemAsReadInputSchema>;

export interface MarkItemAsReadOutput {
  readonly subject: ReadMarkerSubject;
  readonly subject_id: string;
  /**
   * Whether the item was new for the actor before this call. A marker that a
   * different tab wrote between the read and the write does not change it.
   */
  readonly was_new: boolean;
  /** False when the actor had a marker for the item already */
  readonly created: boolean;
  /**
   * The number of the unread notifications which announced the item and
   * which are read now
   */
  readonly notifications_read: number;
}

/**
 * Marks one item as read by the actor: from its details once they mounted in
 * the browser, or from a click on its "Neu" marker. Also marks the
 * notifications which announced the item as read, also when the marker
 * existed already: a notification can arrive after the read. Repeated calls
 * change nothing.
 *
 * @throws ForbiddenError for a user without a citizen, or without the
 * permission to read the items of the subject type
 * @throws NotFoundError when the item does not exist or the actor cannot see
 * it: a different user can have deleted the item or taken the read access
 * away after the page showed it
 */
export const markItemAsRead = (
  context: ApplicationContext,
  actor: Actor,
  input: MarkItemAsReadInput,
): Promise<MarkItemAsReadOutput> =>
  withSpan(context, "markItemAsRead", async () => {
    requireCitizen(actor);

    const rule = READ_MARKER_SUBJECT_RULES[input.subject];
    if (!rule.canReadSubject(actor))
      throw new ForbiddenError(
        `The permission to read the items of ${input.subject} is missing`,
      );

    const readableIds = await rule.findReadableIds(context, actor, [
      input.subject_id,
    ]);
    if (readableIds.length === 0)
      throw new NotFoundError(ReadMarkerErrorMessage.ItemNotFound);

    const { newIds, createdIds } = await writeReadMarkers(
      context,
      actor,
      input.subject,
      readableIds,
    );

    await auditCreatedReadMarkers(
      context,
      actor,
      createdIds.map((subjectId) => ({ subject: input.subject, subjectId })),
    );

    const notificationsRead = await markAnnouncementsAsRead(context, actor, [
      { subject: input.subject, subjectId: input.subject_id },
    ]);

    return {
      subject: input.subject,
      subject_id: input.subject_id,
      was_new: newIds.length > 0,
      created: createdIds.length > 0,
      notifications_read: notificationsRead,
    };
  });
