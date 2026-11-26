# Shared definitions of the Remote Control Program

The export of the shared definitions for the desktop companion (decisions 5 and 32 of the [concept](../docs/remote-control-program/README.md#decisions)). The TypeScript code of SAM is the source. Do not change the files of this folder by hand, except this README.

Tests make sure that the files are current: they fail when a file is different from a new export. To write the files, run `pnpm run export:shared-definitions` in `pnpm-monorepo`.

The repository of the desktop companion copies this folder and the [shared test data](../remote-control-program-fixtures/README.md) from the latest release tag of SAM.

| File | Content | Source |
| - | - | - |
| `up-message.schema.json` | The JSON Schema of the messages from a runtime to the relay service | `upMessageSchema` of `protocol.ts` in `packages/domain/src/remoteControlProgram/` |
| `down-message.schema.json` | The JSON Schema of the messages from the relay service to a runtime | `downMessageSchema` of `protocol.ts` |
| `protocol.json` | The protocol versions that the relay service accepts, the close codes of the reasons, and which reasons make a runtime connect again | `protocol.ts` |
| `catalog.json` | The capabilities, the connectors with their versions, the runtime kinds and the limits of the relay service | `catalog.ts` |
| `log-entry-patterns.json` | The patterns of the log file: the type, the oldest type of the pattern chain, the marker, the source and the flags of the JavaScript expression, and `takes_time_of_preceding_line` | `logAnalyzerEntries.ts` in `packages/domain/src/logAnalyzer/` |
| `labels.json` | The German labels of the sharing popover: the categories and the types of the log entries in the order of the lists, and the labels of the capabilities and the connectors. They are presentation, not immutable data. | `PATTERNS.tsx` of the Log Analyzer and `catalogTexts.ts` of the sharing popover in the app |

The JavaScript expressions use the semantics of JavaScript: for example, `\d` and `\w` match only ASCII characters, and `.` does not match a line terminator (`\n`, `\r`, U+2028 and U+2029). A different engine must give the same matches for the shared test data (see `log-files/` of the shared test data).

All keys are in snake_case. The values of the enums are the values of the TypeScript enums.
