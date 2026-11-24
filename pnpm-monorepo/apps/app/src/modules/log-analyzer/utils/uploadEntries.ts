import {
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";

const TYPE_FIELD = "type";
const RAW_LINE_FIELD = "rawLine";
const EVENT_AT_FIELD = "eventAt";
const LINE_NUMBER_FIELD = "lineNumber";

export interface UploadEntry {
  readonly type: LogAnalyzerEntryType;
  readonly rawLine: string;
  /**
   * Only for a type whose lines carry no time of their own. See
   * `takesTimeOfPrecedingLine` of the domain package.
   */
  readonly eventAt?: string;
  readonly lineNumber: number;
}

export const createUploadFormData = (entries: readonly UploadEntry[]) => {
  const formData = new FormData();

  /** Every entry appends every field, so the lists stay aligned */
  for (const entry of entries) {
    formData.append(TYPE_FIELD, entry.type);
    formData.append(RAW_LINE_FIELD, entry.rawLine);
    formData.append(EVENT_AT_FIELD, entry.eventAt ?? "");
    formData.append(LINE_NUMBER_FIELD, String(entry.lineNumber));
  }

  return formData;
};

export const parseUploadFormData = (formData: FormData) => {
  const types = formData.getAll(TYPE_FIELD);
  const rawLines = formData.getAll(RAW_LINE_FIELD);
  const eventAts = formData.getAll(EVENT_AT_FIELD);
  const lineNumbers = formData.getAll(LINE_NUMBER_FIELD);

  /**
   * One entry above the cap is enough to make the schema reject an oversized
   * request, and it keeps a request with many fields from building a large
   * array first. A pair whose two fields do not both exist stays incomplete
   * and the schema rejects it too.
   */
  const length = Math.min(
    Math.max(types.length, rawLines.length),
    MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES + 1,
  );

  return {
    entries: Array.from({ length }, (unused, index) => ({
      type: types[index],
      raw_line: rawLines[index],
      event_at: eventAts[index] || undefined,
      /** The schema rejects a value which is no number, also a file */
      line_number: lineNumbers[index] ? Number(lineNumbers[index]) : undefined,
    })),
  };
};
