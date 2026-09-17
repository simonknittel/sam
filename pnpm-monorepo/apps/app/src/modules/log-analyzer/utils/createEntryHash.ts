import type { EntryType } from "./PATTERNS";

/**
 * The value of `LogAnalyzerEntry.hash`. Together with the uploading citizen
 * it stops the same line from being stored twice. No type holds a line break,
 * thus the first line break is always the separator and two different entries
 * cannot collide, even though a raw line can span two log lines.
 *
 * The Web Crypto API serves the upload action and the browser alike, so that
 * the client compares against the very hashes the server stores.
 */
export const createEntryHash = async (type: EntryType, rawLine: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${type}\n${rawLine}`),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

/** The shape of `createEntryHash`, for the input of the dedup query. */
export const ENTRY_HASH_PATTERN = /^[0-9a-f]{64}$/;
