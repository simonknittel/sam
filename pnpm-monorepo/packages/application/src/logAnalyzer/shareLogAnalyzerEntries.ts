import {
  AuditEventType,
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import {
  requireLogAnalyzerAccess,
  type LogAnalyzerSharingOptions,
} from "./logAnalyzerAccess.js";
import { LogAnalyzerErrorMessage } from "./logAnalyzerErrors.js";
import { validateLogAnalyzerEntries } from "./validateLogAnalyzerEntries.js";

export const shareLogAnalyzerEntriesInputSchema = z.object({
  entries: z
    .array(
      z.object({
        type: z.enum(LogAnalyzerEntryType),
        /**
         * The whole text a pattern matched, which spans two log lines for some
         * patterns
         */
        raw_line: z.string().min(1).max(MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH),
        /**
         * The time of the event, only for a type whose lines carry no time
         * of their own. See `takesTimeOfPrecedingLine`.
         */
        event_at: z.iso.datetime().optional(),
        line_number: z.int32().min(1).optional(),
      }),
    )
    .min(1)
    .max(MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES),
});

export interface ShareLogAnalyzerEntriesOutput {
  readonly entry_count: number;
  readonly new_entry_count: number;
}

/**
 * The unique index on the citizen and the hash absorbs the entries the client
 * sends a second time, for example after a page reload or from a second device.
 *
 * The raw lines hold data of other players, thus neither they nor their hashes
 * are ever written to the logs.
 */
export const shareLogAnalyzerEntries = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof shareLogAnalyzerEntriesInputSchema>,
  options: LogAnalyzerSharingOptions,
): Promise<ShareLogAnalyzerEntriesOutput> =>
  withSpan(context, "shareLogAnalyzerEntries", async () => {
    requireLogAnalyzerAccess(actor, options);

    const citizen = requireCitizen(actor);

    const entries = await validateLogAnalyzerEntries(input.entries);
    if (!entries)
      throw new ValidationError(LogAnalyzerErrorMessage.InvalidEntries);

    const { count: newEntryCount } =
      await context.prisma.logAnalyzerEntry.createMany({
        data: entries.map((entry) => ({
          type: entry.type,
          rawLine: entry.rawLine,
          eventAt: entry.eventAt,
          lineNumber: entry.lineNumber,
          hash: entry.hash,
          createdById: citizen.id,
        })),
        skipDuplicates: true,
      });

    await context.audit.create([
      {
        type: AuditEventType.LOG_ANALYZER_ENTRIES_UPLOADED,
        data: {
          citizenId: citizen.id,
          entryCount: entries.length,
          newEntryCount,
        },
        createdById: actor.userId,
      },
    ]);

    return { entry_count: entries.length, new_entry_count: newEntryCount };
  });
