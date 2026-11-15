import {
  createLogAnalyzerEntryHash,
  matchLogAnalyzerEntryLine,
  takesTimeOfPrecedingLine,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import type * as z from "zod";
import type { shareLogAnalyzerEntriesInputSchema } from "./shareLogAnalyzerEntries.js";

type LogAnalyzerEntryCandidate = z.infer<
  typeof shareLogAnalyzerEntriesInputSchema
>["entries"][number];

export interface ValidatedLogAnalyzerEntry {
  readonly type: LogAnalyzerEntryType;
  readonly rawLine: string;
  readonly eventAt: Date;
  readonly lineNumber: number | null;
  readonly hash: string;
}

/**
 * Runs the pattern of the given type against each raw line again, because the
 * client controls both values. Returns null as soon as one entry does not
 * match its type or carries a time the app cannot read — the whole request is
 * then refused, so malformed input never reaches the database.
 *
 * The pattern must cover the whole raw line. A pattern matches one line
 * inside a longer text, thus a raw line with content around the match could
 * otherwise smuggle unmatched content past the check.
 *
 * The time comes from the raw line, except for a type whose lines carry no
 * time of their own: the client sends it then, and only then.
 */
export const validateLogAnalyzerEntries = async (
  entries: readonly LogAnalyzerEntryCandidate[],
): Promise<ValidatedLogAnalyzerEntry[] | null> => {
  const validatedEntries: ValidatedLogAnalyzerEntry[] = [];

  for (const { type, raw_line, event_at, line_number } of entries) {
    const match = matchLogAnalyzerEntryLine(type, raw_line);
    if (!match?.groups) return null;
    if (match.index !== 0 || match[0].length !== raw_line.length) return null;

    const takesSentTime = takesTimeOfPrecedingLine(type);
    if (takesSentTime !== (event_at !== undefined)) return null;

    const isoDate = takesSentTime ? event_at : match.groups.isoDate;
    if (isoDate === undefined) return null;

    const eventAt = new Date(isoDate);
    if (Number.isNaN(eventAt.getTime())) return null;

    validatedEntries.push({
      type,
      rawLine: raw_line,
      eventAt,
      lineNumber: line_number ?? null,
      hash: await createLogAnalyzerEntryHash(type, raw_line),
    });
  }

  return validatedEntries;
};
