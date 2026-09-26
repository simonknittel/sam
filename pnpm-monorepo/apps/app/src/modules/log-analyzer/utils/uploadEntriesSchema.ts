import * as z from "zod";
import { EntryType } from "./PATTERNS";
import {
  MAXIMUM_RAW_LINE_LENGTH,
  MAXIMUM_UPLOAD_ENTRIES,
} from "./uploadEntries";

export const uploadEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        type: z.enum(EntryType),
        /**
         * The whole text a pattern matched, which spans two log lines for
         * some patterns. `validateUploadEntries` makes sure that the pattern
         * covers the whole text.
         */
        rawLine: z.string().min(1).max(MAXIMUM_RAW_LINE_LENGTH),
        eventAt: z.iso.datetime().optional(),
      }),
    )
    .min(1)
    .max(MAXIMUM_UPLOAD_ENTRIES),
});
