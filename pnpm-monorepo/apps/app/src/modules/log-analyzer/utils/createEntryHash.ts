import { createHash } from "node:crypto";
import type { EntryType } from "./PATTERNS";

/**
 * The value of `LogAnalyzerEntry.hash`. Together with the uploading citizen
 * it stops the same line from being stored twice. A raw line never holds a
 * line break (the upload action rejects one), thus the separator cannot make
 * two different entries collide.
 */
export const createEntryHash = (type: EntryType, rawLine: string) =>
  createHash("sha256").update(`${type}\n${rawLine}`).digest("hex");
