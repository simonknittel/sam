import { expect, test } from "vitest";
import { LogAnalyzerEntryType } from "../logAnalyzer/logAnalyzerEntries.js";
import {
  CapabilityId,
  ConnectorId,
  LOG_ENTRIES_CAPABILITY,
  RELAY_LIMITS,
} from "./catalog.js";
import {
  DownMessageType,
  RelayMessageParseProblem,
  UpMessageType,
  createDownMessage,
  createUpMessage,
  parseDownMessage,
  parseUpMessage,
} from "./protocol.js";

const createLogEntriesBatch = (entryCount: number, rawLine: string) =>
  createUpMessage(UpMessageType.FeedEntries, {
    capability_id: CapabilityId.LogEntries,
    capability_version: LOG_ENTRIES_CAPABILITY.version,
    connector_id: ConnectorId.LogFile,
    connector_version: 1,
    entries: Array.from({ length: entryCount }, (_, index) => ({
      type: LogAnalyzerEntryType.JoinPu,
      raw_line: rawLine,
      event_at: "2026-11-23T20:00:00.000Z",
      line_number: index + 1,
    })),
  });

test("refuses a batch above the limit of the capability, with the id of the message", () => {
  const batch = createLogEntriesBatch(
    LOG_ENTRIES_CAPABILITY.maximumEntriesPerBatch + 1,
    "line",
  );

  expect(parseUpMessage(JSON.stringify(batch))).toEqual({
    success: false,
    problem: RelayMessageParseProblem.ContentNotValid,
    messageId: batch.id,
    protocolVersion: batch.protocol_version,
  });
});

test("refuses an unknown message type", () => {
  const heartbeat = createUpMessage(UpMessageType.Heartbeat, {});

  expect(
    parseUpMessage(JSON.stringify({ ...heartbeat, type: "action_result" })),
  ).toEqual({
    success: false,
    problem: RelayMessageParseProblem.UnknownType,
    messageId: heartbeat.id,
    protocolVersion: heartbeat.protocol_version,
  });
});

test("a full batch of the longest log lines fits into one message", () => {
  /** "€" has 3 bytes in UTF-8 */
  const batch = createLogEntriesBatch(
    LOG_ENTRIES_CAPABILITY.maximumEntriesPerBatch,
    "€".repeat(LOG_ENTRIES_CAPABILITY.maximumRawLineLength),
  );
  const text = JSON.stringify(batch);

  expect(parseUpMessage(text).success).toBe(true);
  expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(
    RELAY_LIMITS.maximumMessageBytes,
  );
});

test("a full page of keys fits into one message", () => {
  const key = "f".repeat(64);
  const page = createDownMessage(DownMessageType.FeedEntryKeys, {
    message_id: crypto.randomUUID(),
    keys: Array.from(
      { length: RELAY_LIMITS.maximumFeedEntryKeysPerPage },
      () => key,
    ),
    next_page_cursor: key,
  });
  const text = JSON.stringify(page);

  expect(parseDownMessage(text).success).toBe(true);
  expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(
    RELAY_LIMITS.maximumMessageBytes,
  );
});
