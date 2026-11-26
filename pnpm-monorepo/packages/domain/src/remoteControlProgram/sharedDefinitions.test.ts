import { describe, expect, test } from "vitest";
import * as z from "zod";
import {
  getOldestLogAnalyzerEntryVersion,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
} from "../logAnalyzer/logAnalyzerEntries.js";
import {
  CAPABILITY_CATALOG,
  CONNECTOR_CATALOG,
  RELAY_LIMITS,
  RuntimeKind,
} from "./catalog.js";
import {
  DOWN_MESSAGE_PROTOCOL_VERSIONS,
  downMessageSchema,
  MINIMUM_RELAY_PROTOCOL_VERSION,
  RELAY_CLOSE_CODES,
  RELAY_PROTOCOL_VERSION,
  RelayCloseReason,
  shouldReconnectAfterClose,
  UP_MESSAGE_PROTOCOL_VERSIONS,
  upMessageSchema,
} from "./protocol.js";

/**
 * The export of the shared definitions for the desktop companion (decisions 5
 * and 32 of `docs/remote-control-program/README.md`) into
 * `remote-control-program-definitions/` in the root of the repository. The
 * test fails when a file is different from a new export. `pnpm run
 * export:shared-definitions` in `pnpm-monorepo` writes the files. The labels
 * of the types come from the app (see `sharedDefinitionLabels.test.ts` of the
 * app).
 */
const DEFINITIONS = "../../../../../remote-control-program-definitions/";

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The schemas tell what a parser accepts. The schemas of the protocol remove
 * an unknown field and accept the message (see `protocol-messages/` of the
 * shared test data), thus the export has no `additionalProperties: false`.
 */
const JSON_SCHEMA_OPTIONS = { io: "input" } as const;

/** The other systems read snake_case keys (see the README of the folder) */
const toSnakeCase = (name: string) =>
  name.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toSnakeCaseKeys = (record: object) =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [toSnakeCase(key), value]),
  );

describe("the export of the shared definitions", () => {
  test("of the protocol", async () => {
    await expect(
      toJson(z.toJSONSchema(upMessageSchema, JSON_SCHEMA_OPTIONS)),
    ).toMatchFileSnapshot(`${DEFINITIONS}up-message.schema.json`);

    await expect(
      toJson(z.toJSONSchema(downMessageSchema, JSON_SCHEMA_OPTIONS)),
    ).toMatchFileSnapshot(`${DEFINITIONS}down-message.schema.json`);

    await expect(
      toJson({
        protocol_version: RELAY_PROTOCOL_VERSION,
        minimum_protocol_version: MINIMUM_RELAY_PROTOCOL_VERSION,
        close_reasons: Object.values(RelayCloseReason).map((reason) => ({
          reason,
          close_code: RELAY_CLOSE_CODES[reason],
          reconnect: shouldReconnectAfterClose(reason),
        })),
        reconnect_after_close_without_reason: shouldReconnectAfterClose(null),
        /** The protocol version that added each message type */
        up_message_protocol_versions: UP_MESSAGE_PROTOCOL_VERSIONS,
        down_message_protocol_versions: DOWN_MESSAGE_PROTOCOL_VERSIONS,
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}protocol.json`);
  });

  test("of the catalog", async () => {
    await expect(
      toJson({
        capabilities: Object.values(CAPABILITY_CATALOG).map(toSnakeCaseKeys),
        connectors: Object.values(CONNECTOR_CATALOG).map(toSnakeCaseKeys),
        runtime_kinds: Object.values(RuntimeKind),
        relay_limits: toSnakeCaseKeys(RELAY_LIMITS),
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}catalog.json`);
  });

  test("of the patterns of the log file", async () => {
    await expect(
      toJson({
        patterns: Object.values(LogAnalyzerEntryType).map((type) => {
          const pattern = LOG_ANALYZER_ENTRY_PATTERNS[type];

          return {
            type,
            oldest_type: getOldestLogAnalyzerEntryVersion(type),
            supersedes: pattern.supersedes ?? null,
            marker: pattern.marker,
            source: pattern.regex.source,
            flags: pattern.regex.flags,
            takes_time_of_preceding_line:
              pattern.takesTimeOfPrecedingLine === true,
          };
        }),
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}log-entry-patterns.json`);
  });
});
