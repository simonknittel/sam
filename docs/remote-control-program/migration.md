# Migration to the Remote Control Program

> [!NOTE]
> This document describes the way from the state of SAM in 2026-11 to the architecture in [Remote Control Program](./README.md). Each step gets its own implementation plan. When all steps are done, remove this document. The architecture document stays.

In this document, "decision 13 of the architecture" refers to the [decisions of the architecture](./README.md#decisions). "M1" to "M11" are the [decisions of the migration](#decisions-of-the-migration).

## Order of the steps

This is not a plan. Each step gets its own implementation plan. The order can change.

On 2026-11-26, the old step 3 ("States, desktop companion and gRPC connector") became the steps 3 to 5, and the old step 4 (the lineup status) became a part of step 4 (M10). The old steps 5 and 6 are now the steps 6 and 7.

1. **Database:** PostgreSQL with TimescaleDB (decision 13 of the architecture), and the move of the SAM databases to such a server (see [The move of the databases](#the-move-of-the-databases)). Done on 2026-11-21 ([#2252](https://github.com/simonknittel/sam/pull/2252)).
2. **Foundation and Log Analyzer:** done on 2026-11-26.
   - The relay service with the WebSocket connection of the runtimes (decision 14 of the architecture), the announcement, the catalog, feeds, grants, and the delivery to the consumers through Soketi. No states (M5).
   - The browser runtime with the log file connector, the local access layer and the sharing popover.
   - The Log Analyzer as a control UI (see [The Log Analyzer](#the-log-analyzer)), the reset of the sharing with an entry in the changelog (M1), and the migration of the stored log entries (M3).
   - The new Log Analyzer replaces the old one in one deployment (M2). The shared test data makes sure that the new log file connector finds the same entries as the old parser.
3. **Desktop companion with the log file connector:**
   - The repository of the desktop companion (decision 32 of the architecture), the export of the shared definitions in SAM, and the sync of the definitions into the repository of the desktop companion.
   - The changes of the OAuth server (see [Changes of existing parts](#changes-of-existing-parts)), the connection token for the desktop companion, the runtime kind of the desktop companion, and the version 2 of the protocol with the read of the own entry keys. The relay service accepts only version 2, and the app and the relay service deploy at the same time (decision 34 of the architecture).
   - The Rust program with GPUI (decision 33 of the architecture) for Windows and Linux: the native OAuth client, the channel client, the log file connector (`log_entries`), the local access layer with the live periods and the upload of older entries, the tray icon and the start with the operating system.
   - In the sharing popover, the tab "Runtimes" with one sub-tab for each runtime, and no tab "Status" (see [Sharing popover](./README.md#sharing-popover)). The sub-tab of the desktop companion tells that the program comes soon, and shows the connected desktop companions and the sign-ins of the owner.
   - No distribution of the program (M9), and no entry in the changelog.
4. **gRPC connector, states and lineup status:**
   - First, an estimate of the sizes: the connections, the messages and the rows of the history for each day.
   - The relay for states, the current state and the history in TimescaleDB: the first hypertable, and the changes of the mirror scripts for hypertables (see [Mirror the database](../mirror-database.md)).
   - The gRPC connector in the desktop companion and the first gRPC capabilities (for example `player_vitals`; `ship_status` and the death states need a test of the `vehicle` and `events` frames first).
   - The lineup status as the first control UI of the states (see [Lineup status](./README.md#lineup-status), M10), the grantee kind "Event participants", and the access requests with their notification (M6).
   - Still no distribution of the program (M9). Open question for the plan of this step: does the lineup status show before step 5, when no citizen can download the desktop companion? Recommendation: show the status of the positions, but show the suggestion to share the own status only from step 5.
5. **Public distribution of the desktop companion:**
   - The releases of the desktop companion: the versions, the GitHub releases, the signature of the updates with a key that only the release process holds, and the update function of the program (see [Desktop companion](./README.md#desktop-companion)).
   - The repository of the desktop companion becomes public, with a license.
   - Reproducible builds also for Linux and the AppImage, and the hash and the manifest of each release (decision 38 of the architecture).
   - Windows: the portable `.exe` without a code signing certificate (decision 25 of the architecture), and a guide for the warning of Windows at the first start. Linux: the AppImage, with a note that the project does not test it (M11).
   - In SAM: the download in the sub-tab of the desktop companion, the matrix of the start tab, the guides and an entry in the changelog.
6. **Actions:** the down channel, the action lifecycle, "ask each time", the action log, and the first action through the gRPC interface.
7. **AI agents:** the MCP read tools first, the action tool later.

## The Log Analyzer

The Log Analyzer moves completely into the Remote Control Program. No old path stays next to it. The target is in [Log Analyzer](./README.md#log-analyzer).

| Today | In the Remote Control Program |
| - | - |
| `apps/app/src/modules/log-analyzer`: the File System Access API, the folder handle in IndexedDB, the parser in a Web Worker, the incremental file reader | The log file connector of the browser runtime. Its core moves into the runtime package. The desktop companion has its own implementation in Rust (decision 5 of the architecture). The folder handle and the autostart of the old Log Analyzer go to the first citizen who uses the browser runtime in the browser (see [Citizens](../../pnpm-monorepo/apps/app/src/modules/remote-control-program/runtime/README.md#citizens)). |
| The share settings in the browser storage (`log_analyzer_share_types`, all off by default), "share older entries" | The rule and the filter of `log_entries` in the local access layer of the browser runtime. Only the lines that the runtime reads live go up automatically, and older entries go up only on an explicit request (decision 27 of the architecture). The old settings are reset (M1). |
| The toggle "Live-Modus": a parse each 10 seconds and a download each 60 seconds | Removed. The runtime reads the log while it runs, and the entries of other citizens arrive in realtime. |
| The server action `uploadLogAnalyzerEntries` and the use case `shareLogAnalyzerEntries`: the check of the line against the pattern, the hash for duplicates | The relay use case "append feed entries", with the same check of the patterns and the new hash. |
| The tRPC routes `getSharedEntries…` and `getOwnEntryHashes…`, the 60-second download | The consumer client, which reads through the relay. The unique keys and the acknowledgements of the [protocol](./README.md#protocol) prevent duplicates. Realtime through Soketi. |
| All citizens with `logAnalyzer;read` see all shared entries | Grants for the live data, and the history after 2 hours without a grant (decision 31 of the architecture). The sharing starts from zero (M1). The Log Analyzer needs `logAnalyzer;read` and `remoteControlProgram;use`, also for the own log (M7). |
| "Live-Status" from the shared entries | No change: the Log Analyzer derives the Live-Status from `log_entries`. |
| The model `LogAnalyzerEntry` | No change of the purpose: the storage of the `log_entries` feed. The stored rows get the IP marker and the new hash (M3). |
| The audit event `LOG_ANALYZER_ENTRIES_UPLOADED`, one event for each upload | Counts for each runtime connection or for each hour (see [Relay](./README.md#relay)), with a new audit event type (see [AGENTS.md](../../AGENTS.md)). |
| The overlay (Document Picture-in-Picture) | No change. |
| The Unleash flag `DisableLogAnalyzerSharing` | The Unleash flag `DisableRemoteControlProgram` (see [Switches](./README.md#switches)). The code stops reading the old flag. The rollout of step 2 uses it to stop the uploads of the old app before M3. Then it is archived. |
| The patterns `LOG_ANALYZER_ENTRY_PATTERNS` | No change. |

## Changes of existing parts

- **OAuth server:** today, it issues tokens only for the MCP server. The audience is the URL of the MCP server, `mcp` is the only scope, and the consent and the token endpoint require `mcp;use`. Step 3 adds the Remote Control Program as a resource with its own audience and scope, a consent with `remoteControlProgram;use`, and the Client ID Metadata Document of the desktop companion (see [Desktop companion](./README.md#desktop-companion) and decision 35 of the architecture). The Unleash flag `DisableMcpServer` then stops only the MCP resource, and `DisableRemoteControlProgram` stops the resource of the Remote Control Program.
- **The app KI-Agenten:** it lists the OAuth grants of the user. From step 3, it lists only the grants of the MCP server. The sub-tab of the desktop companion in the sharing popover lists the grants of the desktop companion.
- **Ban:** today, a ban closes the connections of Soketi and of the wiki editor. Step 2 adds the connections of the relay service.
- **Permissions:** the existing permissions do not change (M4).

### The move of the databases

Done on 2026-11-21:

- The databases of SAM moved to a PostgreSQL server with TimescaleDB (decision 13 of the architecture), with a dump and a restore. Production was read-only for approximately 8 minutes.
- The row counts of all tables were the same after the restore, and `add_timescaledb_extension` was the only new migration.
- Each client of the SAM databases got the new address: the app on Vercel, the Lambda functions, `sam-collab`, the reader role of the Grafana of the statistics and the mirror scripts.

## Decisions of the migration

M1 to M4 are decisions of 2026-11-21. M5 to M7 are decisions of 2026-11-22. M8 is a decision of 2026-11-25. M9 to M11 are decisions of 2026-11-26.

- **M1: The sharing starts from zero.** The deployment of step 2 resets all share settings of the Log Analyzer. The browser runtime ignores and removes the old browser storage `log_analyzer_share_types`. No grant comes from the old sharing. After the deployment, no citizen sees the live entries of an owner until the owner makes a grant. The entries from before are history: each citizen who can open the Log Analyzer sees them (decision 31 of the architecture). The changelog of SAM announces the change.
- **M2: The new Log Analyzer replaces the old one in one deployment.** No version runs next to the old one, and no Unleash flag switches between them. The move of the databases is a separate step before it (step 1).
- **M3: A migration removes the IP addresses from the stored log entries.** The rows of `LogAnalyzerEntry` from before decision 22 of the architecture contain IP addresses. The migration of step 2 replaces them once with the marker of decision 22, and calculates the new hash (see [Log Analyzer](./README.md#log-analyzer)). When two rows of the same owner then have the same hash, the migration keeps the oldest row. This is the only change of existing rows. It is a SQL migration, and a test compares its result with the TypeScript rule on the shared test data. A known limit, found on 2026-11-26: PostgreSQL applies the rule to characters, and JavaScript to UTF-16 code units. For a character outside the Basic Multilingual Plane (for example an emoji) between two IP addresses, the migration gives a different line and hash than the runtimes. The relay then stores such a line once more when an owner uploads it again. The test leaves these cases out.
- **M4: No migration of the permissions.** The existing permissions do not change, and no migration gives `remoteControlProgram;use` to roles. The admins assign it.
- **M5: No states in step 2.** In step 2, no connector supplies a state: the browser runtime has only the log file connector, and `log_entries` is a feed. Thus the relay for states, the history in TimescaleDB and the estimate of the history rows are a part of step 4, together with the first state of the gRPC connector.
- **M6: The access requests are a part of step 4.** In the Log Analyzer, a viewer sees only the owners that made a grant. The lineup status is the first control UI that knows whose data it wants. Until then, only the owner makes grants.
- **M7: The Log Analyzer needs both permissions.** `logAnalyzer;read` and `remoteControlProgram;use`, also for the own log on the machine. Without them, the page is gated.
- **M8: No withdrawal of stored data.** No step of the migration gives the owner a function to withdraw or delete stored data (decisions 12 and 30 of the architecture).
- **M9: No distribution of the desktop companion before step 5.** From step 3, SAM and the relay service accept the desktop companion: the login, the connection, the upload and the display of the data. But only the owner of SAM uses the program, with builds from the private repository (decision 32 of the architecture). The releases, the update function and the download come in step 5.
- **M10: The lineup status comes with the gRPC connector.** The first states need a control UI that shows them. Thus step 4 contains the lineup status, the grantee kind "Event participants" and the access requests. Before, the lineup status was a separate step after the gRPC connector.
- **M11: The Linux version has no manual tests.** Nobody in the project can test the desktop companion on Linux. The continuous integration builds and tests the Linux version, and step 5 releases the AppImage with a note that the project does not test it. Decision 3 of the architecture does not change.

## Related follow-ups

Changes outside of the Remote Control Program that the work on the concept showed:

- **`DailyMcpUsageCount` as a view.** The midnight job counts the audit events with `triggeredViaMcp` of each day and stores the count in `DailyMcpUsageCount`. The view `statistics.daily_mcp_usage_counts` reads this table. `AuditEvent` is small (see decision 7 of the architecture), and it already has a partial index for `triggeredViaMcp`. Thus the view can count the audit events directly, with the same day boundaries (Europe/Berlin). The view then also covers the days before the job existed. The table and the job can then be removed.
- **The mirror into a stage database with extra tables.** `scripts/mirror-database-production-to-stage.sh` restores with `pg_restore --clean`. When the stage database has tables that production does not have (for example `Entity`, `EntityLog` and `EntityLogAttribute` of an old migration), their foreign keys stop the drop of the tables of production, and the restore fails with errors. The stage database is then a mix of both. A fix: drop the schema `public` and make it again before the restore. Until then, [Mirror the database](../mirror-database.md) does not tell this limit.
