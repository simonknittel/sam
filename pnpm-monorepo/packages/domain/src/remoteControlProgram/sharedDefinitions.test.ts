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
  DESKTOP_COMPANION_OPEN_URL,
  DESKTOP_COMPANION_URL_SCHEME,
  RELAY_LIMITS,
  RuntimeKind,
} from "./catalog.js";
import {
  AUTHORIZATION_SERVER_METADATA_PATH,
  DESKTOP_COMPANION_CLIENT_ID_PATH,
  DESKTOP_COMPANION_REDIRECT_URI,
  REMOTE_CONTROL_PROGRAM_PROTECTED_RESOURCE_METADATA_PATH,
  REMOTE_CONTROL_PROGRAM_RESOURCE_PATH,
  REMOTE_CONTROL_PROGRAM_SCOPE,
  RUNTIME_CONNECTION_TOKEN_PATH,
} from "./desktopCompanionLogin.js";
import {
  IP_ADDRESS_MARKER,
  IP_ADDRESS_PATTERNS,
  IP_ADDRESS_REPLACEMENT_FOR_RUST,
  IP_ADDRESS_REPLACEMENT_PASSES,
} from "./ipAddressMarker.js";
import {
  GAME_CHANNEL_PATTERN,
  GAME_VERSION_PATTERN,
  LOG_FILE_HEADER_LINE_COUNT,
  LOG_FILE_HEADER_PATTERNS,
  MAXIMUM_GAME_CHANNEL_LENGTH,
  MAXIMUM_GAME_VERSION_LENGTH,
} from "./logFileHeader.js";
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
        desktop_companion_url_scheme: DESKTOP_COMPANION_URL_SCHEME,
        desktop_companion_open_url: DESKTOP_COMPANION_OPEN_URL,
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

  test("of the header of the log files", async () => {
    await expect(
      toJson({
        line_count: LOG_FILE_HEADER_LINE_COUNT,
        fields: [
          {
            field: "game_channel",
            source: LOG_FILE_HEADER_PATTERNS.gameChannel.source,
            flags: LOG_FILE_HEADER_PATTERNS.gameChannel.flags,
            value_source: GAME_CHANNEL_PATTERN.source,
            maximum_value_length: MAXIMUM_GAME_CHANNEL_LENGTH,
          },
          {
            field: "game_version",
            source: LOG_FILE_HEADER_PATTERNS.gameVersion.source,
            flags: LOG_FILE_HEADER_PATTERNS.gameVersion.flags,
            value_source: GAME_VERSION_PATTERN.source,
            maximum_value_length: MAXIMUM_GAME_VERSION_LENGTH,
          },
        ],
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}log-file-header.json`);
  });

  test("of the login of the desktop companion", async () => {
    await expect(
      toJson({
        authorization_server_metadata_path: AUTHORIZATION_SERVER_METADATA_PATH,
        protected_resource_metadata_path:
          REMOTE_CONTROL_PROGRAM_PROTECTED_RESOURCE_METADATA_PATH,
        resource_path: REMOTE_CONTROL_PROGRAM_RESOURCE_PATH,
        scope: REMOTE_CONTROL_PROGRAM_SCOPE,
        client_id_path: DESKTOP_COMPANION_CLIENT_ID_PATH,
        redirect_uri: DESKTOP_COMPANION_REDIRECT_URI,
        connection_token_path: RUNTIME_CONNECTION_TOKEN_PATH,
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}login.json`);
  });

  test("of the IP rule", async () => {
    await expect(
      toJson({
        marker: IP_ADDRESS_MARKER,
        patterns: IP_ADDRESS_PATTERNS,
        passes_per_pattern: IP_ADDRESS_REPLACEMENT_PASSES,
        replacement: { rust: IP_ADDRESS_REPLACEMENT_FOR_RUST },
      }),
    ).toMatchFileSnapshot(`${DEFINITIONS}ip-address-rule.json`);
  });
});
