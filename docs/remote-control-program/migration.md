# Migration to the Remote Control Program

> [!NOTE]
> This document describes the way from the state of SAM in 2026-11 to the architecture in [Remote Control Program](./README.md). Each step gets its own implementation plan. When all steps are done, remove this document. The architecture document stays.

In this document, "decision 13 of the architecture" refers to the [decisions of the architecture](./README.md#decisions). "M1" to "M4" are the [decisions of the migration](#decisions-of-the-migration).

## Order of the steps

This is not a plan. Each step gets its own implementation plan. The order can change.

1. **Database:** PostgreSQL with TimescaleDB (decision 13 of the architecture), and the move of the SAM databases to such a server (see [The move of the databases](#the-move-of-the-databases)). Done on 2026-11-21 ([#2252](https://github.com/simonknittel/sam/pull/2252)).
2. **Foundation and Log Analyzer:**
   - First, an estimate of the sizes: the connections, the messages and the rows of the history for each day.
   - The relay service with the WebSocket connection of the runtimes (decision 14 of the architecture), the announcement, the catalog, the relay for states with their history in TimescaleDB, feeds and grants.
   - The browser runtime with the log file connector, the local access layer and the sharing popover.
   - The Log Analyzer as a control UI (see [The Log Analyzer](#the-log-analyzer)), the reset of the sharing with an entry in the changelog (M1), and the migration of the stored log entries (M3).
   - The new Log Analyzer replaces the old one in one deployment (M2). The shared test data makes sure that the new log file connector finds the same entries as the old parser.
3. **Desktop companion and gRPC connector:** the Rust program for Windows and Linux, the shared definitions and test data, the changes of the OAuth server (see [Changes of existing parts](#changes-of-existing-parts)), the native OAuth client, the first gRPC capabilities (for example `player_vitals`; `ship_status` and the death states need a test of the `vehicle` and `events` frames first), and the log file connector in the desktop companion (`log_entries`).
4. **Lineup status:** the control UI in the lineup of an event (see [Lineup status](./README.md#lineup-status)), and the grantee kind "Event participants".
5. **Actions:** the down channel, the action lifecycle, "ask each time", the action log, and the first action through the gRPC interface.
6. **AI agents:** the MCP read tools first, the action tool later.

## The Log Analyzer

The Log Analyzer moves completely into the Remote Control Program. No old path stays next to it. The target is in [Log Analyzer](./README.md#log-analyzer).

| Today | In the Remote Control Program |
| - | - |
| `apps/app/src/modules/log-analyzer`: the File System Access API, the folder handle in IndexedDB, the parser in a Web Worker, the incremental file reader | The log file connector of the browser runtime. Its core moves into the runtime package. The desktop companion has its own implementation in Rust (decision 5 of the architecture). |
| The share settings in the browser storage (`log_analyzer_share_types`, all off by default), "share older entries" | The rule and the filter of `log_entries` in the local access layer of the browser runtime. The old settings are reset (M1). |
| The server action `uploadLogAnalyzerEntries` and the use case `shareLogAnalyzerEntries`: the check of the line against the pattern, the hash for duplicates | The relay use case "append feed entries", with the same check of the patterns and the new hash. |
| The tRPC routes `getSharedEntries…` and `getOwnEntryHashes…`, the 60-second download | The consumer client, which reads through the relay. The unique keys and the acknowledgements of the [protocol](./README.md#protocol) prevent duplicates. Realtime through Soketi. |
| All citizens with `logAnalyzer;read` see all shared entries | Grants. The sharing starts from zero (M1). `logAnalyzer;read` stays the permission of the Log Analyzer. |
| "Live-Status" from the shared entries | No change: the Log Analyzer derives the Live-Status from `log_entries`. |
| The model `LogAnalyzerEntry` | No change of the purpose: the storage of the `log_entries` feed. The stored rows get the IP marker and the new hash (M3). |
| The audit event `LOG_ANALYZER_ENTRIES_UPLOADED`, one event for each upload | Counts for each runtime connection or for each hour (see [Relay](./README.md#relay)), with a new audit event type (see [AGENTS.md](../../AGENTS.md)). |
| The overlay (Document Picture-in-Picture) | No change. |
| The Unleash flag `DisableLogAnalyzerSharing` | A switch of the capability `log_entries`. |
| The patterns `LOG_ANALYZER_ENTRY_PATTERNS` | No change. |

## Changes of existing parts

- **OAuth server:** today, it issues tokens only for the MCP server. The audience is the URL of the MCP server, `mcp` is the only scope, and the consent and the token endpoint require `mcp;use`. Step 3 adds the relay service as a resource with its own audience and scope, a consent with `remoteControlProgram;use`, and the Client ID Metadata Document of the desktop companion (see [Desktop companion](./README.md#desktop-companion)).
- **Ban:** today, a ban closes only the connections of Soketi. Step 2 adds the connections of the relay service.
- **Permissions:** the existing permissions do not change (M4).

### The move of the databases

Done on 2026-11-21:

- The databases of SAM moved to a PostgreSQL server with TimescaleDB (decision 13 of the architecture), with a dump and a restore. Production was read-only for approximately 8 minutes.
- The row counts of all tables were the same after the restore, and `add_timescaledb_extension` was the only new migration.
- Each client of the SAM databases got the new address: the app on Vercel, the Lambda functions, `sam-collab`, the reader role of the Grafana of the statistics and the mirror scripts.

## Decisions of the migration

All decisions of 2026-11-21:

- **M1: The sharing starts from zero.** The deployment of step 2 resets all share settings of the Log Analyzer. The browser runtime ignores and removes the old browser storage `log_analyzer_share_types`. No grant comes from the old sharing. After the deployment, only the owner sees the own shared entries until the owner makes a grant. A grant with a start time in the past can share the old entries again (decision 8 of the architecture). The changelog of SAM announces the change.
- **M2: The new Log Analyzer replaces the old one in one deployment.** No version runs next to the old one, and no Unleash flag switches between them. The move of the databases is a separate step before it (step 1).
- **M3: A migration removes the IP addresses from the stored log entries.** The rows of `LogAnalyzerEntry` from before decision 22 of the architecture contain IP addresses. The migration of step 2 replaces them once with the marker of decision 22, and calculates the new hash (see [Log Analyzer](./README.md#log-analyzer)). When two rows of the same owner then have the same hash, the migration keeps the oldest row. This is the only change of existing rows.
- **M4: No migration of the permissions.** The existing permissions do not change, and no migration gives `remoteControlProgram;use` to roles. The admins assign it.

## Related follow-ups

Changes outside of the Remote Control Program that the work on the concept showed:

- **`DailyMcpUsageCount` as a view.** The midnight job counts the audit events with `triggeredViaMcp` of each day and stores the count in `DailyMcpUsageCount`. The view `statistics.daily_mcp_usage_counts` reads this table. `AuditEvent` is small (see decision 7 of the architecture), and it already has a partial index for `triggeredViaMcp`. Thus the view can count the audit events directly, with the same day boundaries (Europe/Berlin). The view then also covers the days before the job existed. The table and the job can then be removed.
- **The mirror into a stage database with extra tables.** `scripts/mirror-database-production-to-stage.sh` restores with `pg_restore --clean`. When the stage database has tables that production does not have (for example `Entity`, `EntityLog` and `EntityLogAttribute` of an old migration), their foreign keys stop the drop of the tables of production, and the restore fails with errors. The stage database is then a mix of both. A fix: drop the schema `public` and make it again before the restore. Until then, [Mirror the database](../mirror-database.md) does not tell this limit.
