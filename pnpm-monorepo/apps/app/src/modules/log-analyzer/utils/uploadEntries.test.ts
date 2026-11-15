import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import { SAMPLE_LINES } from "./sampleLines";
import { createUploadFormData, parseUploadFormData } from "./uploadEntries";

describe("parseUploadFormData", () => {
  test("carries the sent time and the line number through the form data", () => {
    const crashEventAt = "2026-09-01T16:15:11.246Z";

    const formData = createUploadFormData([
      {
        type: LogAnalyzerEntryType.GameCrash,
        rawLine: SAMPLE_LINES[LogAnalyzerEntryType.GameCrash],
        eventAt: crashEventAt,
        lineNumber: 10,
      },
      {
        type: LogAnalyzerEntryType.JoinPu,
        rawLine: SAMPLE_LINES[LogAnalyzerEntryType.JoinPu],
        lineNumber: 11,
      },
    ]);

    expect(parseUploadFormData(formData)).toEqual({
      entries: [
        {
          type: LogAnalyzerEntryType.GameCrash,
          raw_line: SAMPLE_LINES[LogAnalyzerEntryType.GameCrash],
          event_at: crashEventAt,
          line_number: 10,
        },
        {
          type: LogAnalyzerEntryType.JoinPu,
          raw_line: SAMPLE_LINES[LogAnalyzerEntryType.JoinPu],
          event_at: undefined,
          line_number: 11,
        },
      ],
    });
  });
});
