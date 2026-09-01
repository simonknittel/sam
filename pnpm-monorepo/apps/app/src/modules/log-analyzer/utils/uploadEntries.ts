import { z } from "zod";
import { EntryType } from "./PATTERNS";

/**
 * How many entries one upload request carries. The client splits a larger
 * backfill into more requests.
 */
export const MAXIMUM_UPLOAD_ENTRIES = 100;

/** Longer than the longest known log line, which is a disconnection line. */
export const MAXIMUM_RAW_LINE_LENGTH = 4000;

const TYPE_FIELD = "type";
const RAW_LINE_FIELD = "rawLine";

export interface UploadEntry {
  readonly type: EntryType;
  readonly rawLine: string;
}

export const uploadEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        type: z.enum(EntryType),
        rawLine: z
          .string()
          .min(1)
          .max(MAXIMUM_RAW_LINE_LENGTH)
          /**
           * One entry is one line. A line break would let a request smuggle
           * unmatched content past the pattern check, because the patterns
           * match one line inside a longer text.
           */
          .refine((value) => !value.includes("\n") && !value.includes("\r")),
      }),
    )
    .min(1)
    .max(MAXIMUM_UPLOAD_ENTRIES),
});

export const createUploadFormData = (entries: readonly UploadEntry[]) => {
  const formData = new FormData();

  for (const entry of entries) {
    formData.append(TYPE_FIELD, entry.type);
    formData.append(RAW_LINE_FIELD, entry.rawLine);
  }

  return formData;
};

export const parseUploadFormData = (formData: FormData) => {
  const types = formData.getAll(TYPE_FIELD);
  const rawLines = formData.getAll(RAW_LINE_FIELD);

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
    })),
  };
};
