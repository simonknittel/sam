# Shared definitions of the Remote Control Program

The export of the shared definitions for the desktop companion (decisions 5 and 32 of the [concept](../docs/remote-control-program/README.md#decisions)). The TypeScript code of SAM is the source. Do not change the files of this folder by hand, except this README.

Tests make sure that the files are current: they fail when a file is different from a new export. To write the files, run `pnpm run export:shared-definitions` in `pnpm-monorepo`.

The repository of the desktop companion copies this folder and the [shared test data](../remote-control-program-fixtures/README.md) from the latest release tag of SAM.

| File | Content | Source |
| - | - | - |
| `up-message.schema.json` | The JSON Schema of the messages from a runtime to the relay service | `upMessageSchema` of `protocol.ts` in `packages/domain/src/remoteControlProgram/` |
| `down-message.schema.json` | The JSON Schema of the messages from the relay service to a runtime | `downMessageSchema` of `protocol.ts` |
| `protocol.json` | The protocol versions that the relay service accepts, the close codes of the reasons, which reasons make a runtime connect again, and the protocol version that added each message type | `protocol.ts` |
| `catalog.json` | The capabilities, the connectors with their versions, the runtime kinds, the limits of the relay service, and the URL scheme of the desktop companion | `catalog.ts` |
| `log-entry-patterns.json` | The patterns of the log file: the type, the oldest type of the pattern chain, the marker, the source and the flags of the JavaScript expression, and `takes_time_of_preceding_line` | `logAnalyzerEntries.ts` in `packages/domain/src/logAnalyzer/` |
| `log-file-header.json` | The rule of the header of a log file (decision 17): the number of the header lines (`line_count`), and for each field of an entry (`game_channel`, `game_version`) the source and the flags of the JavaScript expression of its header line, and the check of its value (`value_source`, `maximum_value_length`). See below for how to apply the rule. | `logFileHeader.ts` |
| `ip-address-rule.json` | The IP rule (decision 22): the marker, the expressions (`name`, `source`) in the order of their application, the passes of each expression, and the replacement in the syntax of the `regex` crate of Rust. The [shared test data](../remote-control-program-fixtures/README.md#ip-address-marker) tells how to apply the rule. | `ipAddressMarker.ts` |
| `login.json` | The values of the login of the desktop companion (decision 35) and the path of the route of the connection tokens. The paths are relative to the SAM address. The program adds the port of its listener to `redirect_uri` (RFC 8252 section 7.3). | `desktopCompanionLogin.ts` |
| `labels.json` | The German labels of the sharing popover: the categories and the types of the log entries in the order of the lists, and the labels of the capabilities and the connectors. They are presentation, not immutable data. | `PATTERNS.tsx` of the Log Analyzer and `catalogTexts.ts` of the sharing popover in the app |

The JavaScript expressions use the semantics of JavaScript: for example, `\d` and `\w` match only ASCII characters, and `.` does not match a line terminator (`\n`, `\r`, U+2028 and U+2029). A different engine must give the same matches for the shared test data (see `log-files/` of the shared test data).

The header rule gives each entry of a log file the values of the header of the same file:

1. The header is the first `line_count` lines of the file. A line ends with `\n`. Remove one `\r` at the end of a line, and a byte order mark at the start of the file. In a file that the game still writes, a last line without a line end is not a complete line yet.
2. For each field, the first header line in which the expression finds a match, and whose group `value` passes the check, gives the value. The check: not more than `maximum_value_length` characters, and a match of `value_source`.
3. A field without such a line is null.

A read in parts gives the same values when it keeps the values of the lines that it read before, and continues with the next header line. The [shared test data](../remote-control-program-fixtures/README.md#log-file-header) contains examples.

All keys are in snake_case. The values of the enums are the values of the TypeScript enums.
