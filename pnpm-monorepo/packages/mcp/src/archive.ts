import { strToU8, zipSync, type Zippable } from "fflate";
import { createHash } from "node:crypto";

/**
 * The modification time of each file. A zip file keeps the local date and
 * time without a time zone, and fflate writes the local fields of this date.
 * Thus a date in local time gives the same bytes on each host. 1980-01-01 is
 * the earliest date that a zip file can keep.
 */
const FILE_MODIFICATION_TIME = new Date(1980, 0, 1);

const COMPRESSION_LEVEL = 9;

export interface ArchiveFile {
  /** Relative to the root of the archive, with `/` as the separator */
  readonly path: string;
  readonly text: string;
}

export interface Archive {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly sha256: string;
}

/**
 * The same files always give the same bytes: the version of a Claude plugin and
 * the digests of the skill index are the SHA-256 digests of the bytes
 */
export const createArchive = (files: readonly ArchiveFile[]): Archive => {
  const entries: Zippable = Object.fromEntries(
    files.map((file) => [file.path, strToU8(file.text)]),
  );
  const bytes = zipSync(entries, {
    level: COMPRESSION_LEVEL,
    mtime: FILE_MODIFICATION_TIME,
  });

  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
};
