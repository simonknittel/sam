import { createEntryHash } from "./createEntryHash";
import {
  isShareableEntryType,
  matchEntryLine,
  type EntryType,
} from "./PATTERNS";
import type { UploadEntry } from "./uploadEntries";

export interface ValidatedUploadEntry {
  readonly type: EntryType;
  readonly rawLine: string;
  readonly eventAt: Date;
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
 */
export const validateUploadEntries = async (
  entries: readonly UploadEntry[],
): Promise<ValidatedUploadEntry[] | null> => {
  const validatedEntries: ValidatedUploadEntry[] = [];

  for (const { type, rawLine } of entries) {
    if (!isShareableEntryType(type)) return null;

    const match = matchEntryLine(type, rawLine);
    if (!match?.groups) return null;
    if (match.index !== 0 || match[0].length !== rawLine.length) return null;

    const eventAt = new Date(match.groups.isoDate);
    if (Number.isNaN(eventAt.getTime())) return null;

    validatedEntries.push({
      type,
      rawLine,
      eventAt,
      hash: await createEntryHash(type, rawLine),
    });
  }

  return validatedEntries;
};
