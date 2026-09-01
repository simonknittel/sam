import { createEntryHash } from "./createEntryHash";
import { matchEntryLine, type EntryType } from "./PATTERNS";
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
 */
export const validateUploadEntries = (
  entries: readonly UploadEntry[],
): ValidatedUploadEntry[] | null => {
  const validatedEntries: ValidatedUploadEntry[] = [];

  for (const { type, rawLine } of entries) {
    const groups = matchEntryLine(type, rawLine);
    if (!groups) return null;

    const eventAt = new Date(groups.isoDate);
    if (Number.isNaN(eventAt.getTime())) return null;

    validatedEntries.push({
      type,
      rawLine,
      eventAt,
      hash: createEntryHash(type, rawLine),
    });
  }

  return validatedEntries;
};
