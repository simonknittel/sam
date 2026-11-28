import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CONNECTOR_CATALOG,
  containsIpAddress,
  createLogEntryHash,
  feedEntriesContentSchema,
  LOG_ENTRIES_CAPABILITY,
  matchLogAnalyzerEntryLine,
  runtimeIdSchema,
  takesTimeOfPrecedingLine,
  type FeedEntriesContent,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  FEED_LOG_ENTRY_SELECT,
  toFeedLogEntry,
  type FeedLogEntry,
} from "./feedLogEntry.js";

export const appendFeedEntriesInputSchema = z.object({
  /** The runtime of the connection (`RuntimeConnection.runtimeId`) */
  runtime_id: runtimeIdSchema,
  /** The content of one `feed_entries` message */
  batch: feedEntriesContentSchema,
});

export type AppendFeedEntriesInput = z.output<
  typeof appendFeedEntriesInputSchema
>;

/**
 * The error codes of the `ack` of a refused batch. `message_not_valid`: the
 * connector does not supply the capability, or the relay does not know the
 * version of the connector. `entries_not_valid`: no entry of the batch is
 * valid.
 */
export type FeedEntriesRefusal =
  | AcknowledgementErrorCode.MessageNotValid
  | AcknowledgementErrorCode.EntriesNotValid;

/** The counts of `recordFeedEntryUploadCounts()` */
export interface FeedEntryUploadCounts {
  /** The entries that the relay did not have before */
  readonly newEntryCount: number;
  /** The valid entries that the relay already had */
  readonly duplicateEntryCount: number;
  /** The entries that the relay did not accept */
  readonly refusedEntryCount: number;
}

export type AppendFeedEntriesOutput =
  | {
      readonly result: AcknowledgementResult.Accepted;
      /** For the delivery to the viewers */
      readonly newEntries: FeedLogEntry[];
      readonly counts: FeedEntryUploadCounts;
    }
  | {
      readonly result: AcknowledgementResult.Refused;
      readonly errorCode: FeedEntriesRefusal;
      readonly counts: FeedEntryUploadCounts;
    };

type LogEntryOfBatch = FeedEntriesContent["entries"][number];

/** Why the relay refuses one entry. Only for the logs. */
enum LogEntryProblem {
  TooLong = "too_long",
  IpAddress = "ip_address",
  PatternMismatch = "pattern_mismatch",
  TimeNotValid = "time_not_valid",
}

type LogEntryCheck =
  | { readonly isValid: true; readonly observedAt: Date }
  | { readonly isValid: false; readonly problem: LogEntryProblem };

const refuse = (problem: LogEntryProblem): LogEntryCheck => ({
  isValid: false,
  problem,
});

/**
 * Checks one entry again, because the runtime controls the input: the
 * length, the IP addresses (decision 22), the pattern of the type, and the
 * time. The time of the observation is the time of the raw line. Only a type
 * whose lines have no time of their own (`takesTimeOfPrecedingLine`) takes
 * `event_at` of the runtime. For the other types, the relay ignores
 * `event_at`: the raw line is the source, and the hash contains it.
 */
const checkLogEntry = (entry: LogEntryOfBatch): LogEntryCheck => {
  // The schema has the same limit. The check stays, because the work of the patterns and the stored line depend on it.
  if (entry.raw_line.length > LOG_ENTRIES_CAPABILITY.maximumRawLineLength)
    return refuse(LogEntryProblem.TooLong);

  if (containsIpAddress(entry.raw_line))
    return refuse(LogEntryProblem.IpAddress);

  // The match must cover the full raw line, else text around the match passes without a check
  const match = matchLogAnalyzerEntryLine(entry.type, entry.raw_line);
  if (!match || match.index !== 0 || match[0].length !== entry.raw_line.length)
    return refuse(LogEntryProblem.PatternMismatch);

  const isoDate = takesTimeOfPrecedingLine(entry.type)
    ? entry.event_at
    : match.groups?.isoDate;
  if (isoDate === undefined) return refuse(LogEntryProblem.TimeNotValid);

  const observedAt = new Date(isoDate);
  if (Number.isNaN(observedAt.getTime()))
    return refuse(LogEntryProblem.TimeNotValid);

  return { isValid: true, observedAt };
};

/**
 * Null when the catalog accepts the connector of the batch. The schema of the
 * protocol (`feedEntriesContentSchema`) already refuses an unknown capability
 * version and too many entries.
 */
const findBatchProblem = (batch: FeedEntriesContent) => {
  const connector = CONNECTOR_CATALOG[batch.connector_id];

  if (
    !connector.capabilityIds.includes(batch.capability_id) ||
    batch.connector_version > connector.version
  )
    return AcknowledgementErrorCode.MessageNotValid;

  return null;
};

const toRefusal = (
  errorCode: FeedEntriesRefusal,
  batch: FeedEntriesContent,
): AppendFeedEntriesOutput => ({
  result: AcknowledgementResult.Refused,
  errorCode,
  counts: {
    newEntryCount: 0,
    duplicateEntryCount: 0,
    refusedEntryCount: batch.entries.length,
  },
});

/**
 * Stores one batch of a runtime of the actor (the owner): the relay service
 * calls it for each `feed_entries` message, with the actor of the
 * `RuntimeConnection`. It checks the permission, the catalog and the
 * Unleash flag, and then each entry. An entry that is not
 * valid does not refuse the batch: the relay stores the valid entries and
 * counts the other entries as refused. Thus one defective line, for example
 * from a difference of the regular expression engines of the runtimes, does
 * not lose the valid lines of the batch, which the runtime does not send
 * again. Only a batch without a valid entry gets `entries_not_valid`. A line
 * with an IP address is never stored.
 *
 * The time of the arrival (`createdAt`) is `context.now()`, the time of the
 * relay. A time of the observation after it becomes the time of the arrival
 * (see "Time" of `docs/remote-control-program/README.md`). The hash of an
 * entry is its unique key for the owner: a second copy of an entry makes no
 * new row (the unique index of the owner and the hash).
 *
 * No audit event for each batch: the relay service writes the counts with
 * `recordFeedEntryUploadCounts()`. The logs get no raw line and no hash,
 * because the raw lines contain data of other players.
 *
 * The relay service parses the batch with the schema of the protocol before
 * the call.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 * (the relay service closes with `access_denied`), or when the switch of the
 * full Remote Control Program is off
 * (`RemoteControlProgramErrorMessage.ProgramTurnedOff`, the relay service
 * closes with `program_turned_off`)
 * @returns the `ack` of the batch: accepted with the new entries, or refused
 * with the error code. Both with the counts.
 */
export const appendFeedEntries = (
  context: ApplicationContext,
  actor: Actor,
  input: AppendFeedEntriesInput,
): Promise<AppendFeedEntriesOutput> =>
  withSpan(context, "appendFeedEntries", async (span) => {
    const citizen = requireRemoteControlProgramUse(actor);
    const { batch } = input;
    span.setAttributes({
      "remote_control_program.capability_id": batch.capability_id,
      "remote_control_program.entry_count": batch.entries.length,
    });

    const batchProblem = findBatchProblem(batch);
    if (batchProblem) return toRefusal(batchProblem, batch);

    if (await context.isRemoteControlProgramTurnedOff())
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ProgramTurnedOff,
      );

    const now = context.now();
    const checkedEntries = batch.entries.map((entry) => ({
      entry,
      check: checkLogEntry(entry),
    }));
    const validEntries = checkedEntries.flatMap(({ entry, check }) =>
      check.isValid
        ? [{ entry, eventAt: check.observedAt > now ? now : check.observedAt }]
        : [],
    );
    const refusedEntries = checkedEntries.flatMap(({ entry, check }) =>
      check.isValid ? [] : [{ type: entry.type, problem: check.problem }],
    );

    if (refusedEntries.length > 0)
      context.log.warn("Refused log entries of an upload", {
        ownerCitizenId: citizen.id,
        runtimeId: input.runtime_id,
        refusedEntries,
      });

    if (validEntries.length === 0)
      return toRefusal(AcknowledgementErrorCode.EntriesNotValid, batch);

    const rows = await context.prisma.logAnalyzerEntry.createManyAndReturn({
      data: await Promise.all(
        validEntries.map(async ({ entry, eventAt }) => ({
          type: entry.type,
          rawLine: entry.raw_line,
          eventAt,
          lineNumber: entry.line_number,
          hash: await createLogEntryHash(entry.type, entry.raw_line),
          createdById: citizen.id,
          createdAt: now,
          runtimeId: input.runtime_id,
          connectorVersion: batch.connector_version,
          capabilityVersion: batch.capability_version,
          gameEnvironment: entry.game_environment,
          gameBuild: entry.game_build,
        })),
      ),
      skipDuplicates: true,
      select: FEED_LOG_ENTRY_SELECT,
    });

    const counts: FeedEntryUploadCounts = {
      newEntryCount: rows.length,
      duplicateEntryCount: validEntries.length - rows.length,
      refusedEntryCount: refusedEntries.length,
    };
    span.setAttributes({
      "remote_control_program.new_entry_count": counts.newEntryCount,
      "remote_control_program.duplicate_entry_count":
        counts.duplicateEntryCount,
      "remote_control_program.refused_entry_count": counts.refusedEntryCount,
    });

    return {
      result: AcknowledgementResult.Accepted,
      newEntries: rows.map((row) =>
        toFeedLogEntry(row, { id: citizen.id, handle: citizen.handle }),
      ),
      counts,
    };
  });
