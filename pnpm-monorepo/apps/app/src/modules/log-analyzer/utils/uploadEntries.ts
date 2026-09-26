import type { EntryType } from "./PATTERNS";

/**
 * How many entries one upload request carries. The client splits a larger
 * backfill into more requests.
 */
export const MAXIMUM_UPLOAD_ENTRIES = 100;

/** Longer than the longest known log line, which is a disconnection line. */
export const MAXIMUM_RAW_LINE_LENGTH = 4000;

const TYPE_FIELD = "type";
const RAW_LINE_FIELD = "rawLine";
const EVENT_AT_FIELD = "eventAt";

export interface UploadEntry {
  readonly type: EntryType;
  readonly rawLine: string;
  /**
   * The time of the event, only for a type whose lines carry no time of
   * their own. See `Pattern.takesTimeOfPrecedingLine`.
   */
  readonly eventAt?: string;
}

export const createUploadFormData = (entries: readonly UploadEntry[]) => {
  const formData = new FormData();

  /** Every entry appends every field, so the three lists stay aligned */
  for (const entry of entries) {
    formData.append(TYPE_FIELD, entry.type);
    formData.append(RAW_LINE_FIELD, entry.rawLine);
    formData.append(EVENT_AT_FIELD, entry.eventAt ?? "");
  }

  return formData;
};

export const parseUploadFormData = (formData: FormData) => {
  const types = formData.getAll(TYPE_FIELD);
  const rawLines = formData.getAll(RAW_LINE_FIELD);
  const eventAts = formData.getAll(EVENT_AT_FIELD);

  /**
   * One entry above the cap is enough to make the schema reject an oversized
   * request, and it keeps a request with many fields from building a large
   * array first. A pair whose two fields do not both exist stays incomplete
   * and the schema rejects it too.
   */
  const length = Math.min(
    Math.max(types.length, rawLines.length),
    MAXIMUM_UPLOAD_ENTRIES + 1,
  );

  return {
    entries: Array.from({ length }, (unused, index) => ({
      type: types[index],
      rawLine: rawLines[index],
      eventAt: eventAts[index] || undefined,
    })),
  };
};
