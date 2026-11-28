# Shared test data of the Remote Control Program

The implementations of the log file connector (TypeScript and Rust), the protocol, the relay and the M3 migration (SQL) use this data. The repository of the desktop companion gets a copy (decision 32 of the concept). They must give the same results (principle 11 and decision 22 of the [concept](../docs/remote-control-program/README.md)). The format is neutral: plain log files and JSON with snake_case keys.

The expected values are immutable data, like the patterns of the Log Analyzer. Do not change an expected value to make a test pass. A different result needs a new version of the rule (see `pnpm-monorepo/packages/domain/src/remoteControlProgram/ipAddressMarker.ts`). You can add files and cases. Check a new expected value with a second implementation or by hand.

Before the first release, step 2 removed one expected match from `expected-matches.json`: the match of the partly written last line of `LIVE/Game.log` (line 12). The connector now waits for the line end (see the end of [`log-files/`](#log-files)). The Rust connector of step 3 must obey this rule.

Tests that use this data:

- `pnpm-monorepo/packages/domain/src/remoteControlProgram/fixtures.test.ts`
- `pnpm-monorepo/packages/remote-control-program-runtime/src/logFile/logFileReader.fixtures.test.ts`

## `ip-address-marker/`

`rule.json` is the IP rule. A program reads the rule from the [export of the shared definitions](../remote-control-program-definitions/README.md) (`ip-address-rule.json`). A test of SAM makes sure that both contain the same rule.

- `marker`: the text that replaces each address.
- `patterns`: the regular expressions (`name`, `source`) in the order of their application. Apply each expression `passes_per_pattern` times. Each time, replace all matches (`g` in JavaScript and PostgreSQL, `replace_all` in Rust). Use no other flag: no case-insensitive flag, no multiline flag.
- `replacement`: the replacement text in the syntax of each engine (`javascript`, `postgresql`, `rust`).

`cases.json` contains `cases`. Each case has:

- `description`
- `input`: a raw line.
- `output`: the raw line after the rule.
- `input_contains_ip_address`, `output_contains_ip_address`: the result of the check of the relay. The check is true when one of the expressions finds a match.

## `log-file-header/`

`cases.json` contains `cases`: the first lines of log files with the values of their header (see the header rule in the [export of the shared definitions](../remote-control-program-definitions/README.md)). Each case has:

- `description`
- `lines`: the lines of the start of a complete file, each without its `\n`. A line of a file with CRLF line ends has a `\r` at its end.
- `game_environment`, `game_build`: the values of the header, or null.

## `protocol-messages/`

`cases.json` contains `cases`: messages of the [protocol](../docs/remote-control-program/README.md#protocol) between a runtime and the relay service. Each case has:

- `description`
- `direction`: `up` (from the runtime to the relay service) or `down` (from the relay service to the runtime).
- `valid`: the result of the schema of the protocol. An unknown field gives no error: the schemas remove it. An unknown message type or an unknown value of an enum is not valid.
- `message`: the full message with its envelope.

## `log-entry-hash/`

`cases.json` contains `cases`. Each case has `description`, `type`, `oldest_type` (the oldest type of the pattern chain, see `supersedes` of the patterns), `raw_line_with_marker` and `hash`. The hash is SHA-256 (hexadecimal, lowercase) of the UTF-8 text: `oldest_type`, a line feed (`\n`) and `raw_line_with_marker`.

## `log-files/`

Log files of the game in the folders of the game. The handles are invented. The IP addresses are from the ranges for documentation (RFC 5737 and RFC 3849).

| File | Contents |
| - | - |
| `LIVE/Game.log` | The running session. CRLF line ends. The game still writes the last line: it has no line end. |
| `LIVE/logbackups/Game Build(10498765) 21 Nov 26 (17 58 43).log` | A session that crashed. CRLF line ends. At the end, the crash report without timestamps. |
| `LIVE/logbackups/Game Build(10512345) 22 Nov 26 (20 14 05).log` | A session that ended. LF line ends. IPv6 addresses, also after a key (`ipv6:`, `peer_addr:`). |
| `LIVE/logbackups/Game Build(10523456) 23 Nov 26 (19 02 11).log` | The encoding and the character classes. LF line ends. Bytes that are not valid UTF-8: each invalid byte or incomplete sequence becomes one replacement character (U+FFFD), like the `TextDecoder` of a browser. A valid character outside of ASCII. Two lines that give no match, because `\w` and `\d` of JavaScript match only ASCII characters: a shard name with `ü`, and a timestamp with an Arabic-Indic digit. A Rust engine with Unicode classes would match them. |
| `PTU/Game.log` | A session of the environment PTU with the full header: the build number in line 1 (`BackupNameAttachment`) and the executable in line 5. CRLF line ends. |

`expected-matches.json` contains `files`. Each file has:

- `path`: relative to `log-files/`.
- `session_start_from_file_name`: the local time in the name of a backup (without a time zone), or null.
- `game_environment`, `game_build`: the values of the header of the file (see `log-file-header/`), or null. Each match of the file has these values.
- `matches`: the matches of the log file connector (`createLogFileReader` of the browser runtime, a full read of the file), sorted by `line_number` and `type`.

Each match has:

- `line_number`: the number of the first line of the match. The first line of the file has the number 1.
- `type`: the newest version of the pattern that matches the line.
- `iso_date`: the time of the entry. For a type that takes the time of the preceding line (the crash), the time of the last line with a timestamp before the match.
- `raw_line`: the text of the match. A match of two lines contains the line end of the file (`\r\n` or `\n`) between the two lines. It has no line end and no `\r` at its end.
- `raw_line_with_marker`: `raw_line` after the IP rule.
- `hash`: the hash of the entry (see `log-entry-hash/`).

A last line without a line end gives no match in a file that the game still writes (`Game.log`), also when the pattern of the type accepts the part that the game wrote. The connector waits for the line end. Else the part and the full line would give two entries with different hashes. A backup (a file with the start of its session in its name, in `logbackups/`) is finished: its last line gives a match also without a line end.
