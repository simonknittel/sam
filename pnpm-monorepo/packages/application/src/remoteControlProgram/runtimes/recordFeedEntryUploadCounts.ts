import {
  AuditEventType,
  CapabilityId,
  runtimeIdSchema,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ValidationError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";

const countSchema = z.int().min(0);

export const recordFeedEntryUploadCountsInputSchema = z.object({
  runtime_id: runtimeIdSchema,
  capability_id: z.enum(CapabilityId),
  /** The entries that the relay stored as new entries */
  new_entry_count: countSchema,
  /** The entries that the relay already held */
  duplicate_entry_count: countSchema,
  /** The entries that the relay did not accept */
  refused_entry_count: countSchema,
  /** The connection, or the end of the previous count of the connection */
  period_started_at: z.date(),
  period_ended_at: z.date(),
});

export type RecordFeedEntryUploadCountsInput = z.output<
  typeof recordFeedEntryUploadCountsInputSchema
>;

export interface RecordFeedEntryUploadCountsOutput {
  /** False when all counts are 0: the system log gets no event */
  readonly isRecorded: boolean;
}

/**
 * Writes the counts of the uploads of one capability on one runtime
 * connection of the actor (the owner) in one period into the system log.
 * The relay service calls it at the close of a connection and at the latest
 * each hour. The log records only the counts, because the raw lines hold
 * data of other players. It needs no permission: the counts describe
 * uploads that happened, also when the user lost the permission after them.
 *
 * @throws ForbiddenError when the actor has no citizen
 * @throws ValidationError when the period ends before it starts
 */
export const recordFeedEntryUploadCounts = (
  context: ApplicationContext,
  actor: Actor,
  input: RecordFeedEntryUploadCountsInput,
): Promise<RecordFeedEntryUploadCountsOutput> =>
  withSpan(context, "recordFeedEntryUploadCounts", async () => {
    const citizen = requireCitizen(actor);

    if (input.period_ended_at < input.period_started_at)
      throw new ValidationError("The period ends before it starts");

    if (
      input.new_entry_count === 0 &&
      input.duplicate_entry_count === 0 &&
      input.refused_entry_count === 0
    )
      return { isRecorded: false };

    await context.audit.create([
      {
        type: AuditEventType.REMOTE_CONTROL_PROGRAM_FEED_ENTRIES_UPLOADED,
        data: {
          ownerCitizenId: citizen.id,
          runtimeId: input.runtime_id,
          capabilityId: input.capability_id,
          newEntryCount: input.new_entry_count,
          duplicateEntryCount: input.duplicate_entry_count,
          refusedEntryCount: input.refused_entry_count,
          periodStartedAt: input.period_started_at,
          periodEndedAt: input.period_ended_at,
        },
        createdById: actor.userId,
      },
    ]);

    return { isRecorded: true };
  });
