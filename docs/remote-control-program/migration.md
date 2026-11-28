# Migration to the Remote Control Program

> [!NOTE]
> This document describes the way from the state of SAM in 2026-11 to the architecture in [Remote Control Program](./README.md). Each step gets its own implementation plan. The order of the steps can change. When all steps are done, remove this document. The architecture document stays.

In this document, "decision 13 of the architecture" refers to the [decisions of the architecture](./README.md#decisions).

## Order of the steps

1. **Database:** PostgreSQL with TimescaleDB (decision 13 of the architecture). Done on 2026-11-21 ([#2252](https://github.com/simonknittel/sam/pull/2252)).
2. **Foundation and Log Analyzer:** the relay service, the browser runtime with the log file connector, and the Log Analyzer as a control UI. Done on 2026-11-26.
3. **Desktop companion with the log file connector:**
   - The repository of the desktop companion (decision 32 of the architecture), the export of the shared definitions in SAM, and the sync of the definitions into the repository of the desktop companion.
   - The changes of the OAuth server (see [Changes of existing parts](#changes-of-existing-parts)), the connection token for the desktop companion, the runtime kind of the desktop companion, and the version 2 of the protocol with the read of the own entry keys.
   - The Rust program with GPUI (decision 33 of the architecture) for Windows and Linux: the native OAuth client, the onboarding (the sign-in and the Star Citizen folder), the channel client, the log file connector (`log_entries`) for all environment folders, the local access layer with the upload of older entries, the tray icon and the start with the operating system.
   - The game environment (for example LIVE or PTU) and the build number of each log entry, from the header of its log file, in both runtimes, and their column in the Log Analyzer (decision 17 of the architecture).
   - In the sharing popover, the tab "Runtimes" with one sub-tab for each runtime (see [Sharing popover](./README.md#sharing-popover)). The sub-tab of the desktop companion tells that the program comes soon, and shows the connected desktop companions and the sign-ins of the owner.
   - No distribution of the program, and no entry in the changelog.
4. **gRPC connector, states and lineup status:**
   - First, an estimate of the sizes: the connections, the messages and the rows of the history for each day.
   - The relay for states, the current state and the history in TimescaleDB: the first hypertable, and the changes of the mirror scripts for hypertables (see [Mirror the database](../mirror-database.md)).
   - The gRPC connector in the desktop companion and the first gRPC capabilities (for example `player_vitals`; `ship_status` and the death states need a test of the `vehicle` and `events` frames first).
   - The check of `USER.cfg` when the owner turns on the gRPC connector, and the change of the file after the consent of the owner (see [Desktop companion](./README.md#desktop-companion)).
   - The detection of the running process of the game client in the desktop companion. The gRPC connector uses it for its connection, and for the game environment and the build number of the running game (decision 17 of the architecture). The UI of the desktop companion shows the detected game. The log file connector does not use it.
   - The lineup status as the first control UI of the states (see [Lineup status](./README.md#lineup-status)), the grantee kind "Event participants", and the access requests with their notification. The first states need a control UI that shows them. The lineup status is the first control UI that knows whose data it wants, thus the access requests come with it: until then, only the owner makes grants.
   - Still no distribution of the program: only the owner of SAM uses it, with builds from the private repository (decision 32 of the architecture). Open question for the plan of this step: does the lineup status show before step 5, when no citizen can download the desktop companion? Recommendation: show the status of the positions, but show the suggestion to share the own status only from step 5.
5. **Public distribution of the desktop companion:**
   - The releases of the desktop companion: the versions, the GitHub releases, the signature of the updates with a key that only the release process holds, and the update function of the program with the consent of the owner (see [Desktop companion](./README.md#desktop-companion)).
   - The repository of the desktop companion becomes public, with a license.
   - Reproducible builds also for Linux and the AppImage, and the hash and the manifest of each release (decision 38 of the architecture).
   - A smaller program file: a separate Cargo profile only for the published builds, with its options measured on Windows. The continuous integration keeps the fast default profile.
   - Windows: the portable `.exe` without a code signing certificate (decision 25 of the architecture), and a guide for the warning of Windows at the first start. Linux: the AppImage as an experimental release, which the UI of SAM does not show or name (decision 3 of the architecture).
   - In SAM: the download in the sub-tab of the desktop companion, the matrix of the start tab, the guides and an entry in the changelog.
6. **Actions:** the down channel, the action lifecycle, "ask each time", the action log, and the first action through the gRPC interface.
7. **AI agents:** the MCP read tools first, the action tool later.

## Changes of existing parts

- **OAuth server:** today, it issues tokens only for the MCP server. The audience is the URL of the MCP server, `mcp` is the only scope, and the consent and the token endpoint require `mcp;use`. Step 3 adds the Remote Control Program as a resource with its own audience and scope, a consent with `remoteControlProgram;use`, and the Client ID Metadata Document of the desktop companion (see [Desktop companion](./README.md#desktop-companion) and decision 35 of the architecture). The Unleash flag `DisableMcpServer` then stops only the MCP resource, and `DisableRemoteControlProgram` stops the resource of the Remote Control Program.
- **The app KI-Agenten:** it lists the OAuth grants of the user. From step 3, it lists only the grants of the MCP server. The sub-tab of the desktop companion in the sharing popover lists the grants of the desktop companion.
- **Ban:** today, a ban closes the connections of Soketi and of the wiki editor. Step 2 adds the connections of the relay service.
- **Permissions:** the existing permissions do not change. No migration gives `remoteControlProgram;use` to roles: the admins assign it.
