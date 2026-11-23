# Browser runtime

The browser runtime of the Remote Control Program runs on all SAM pages for a user with `remoteControlProgram;use` (see [Browser runtime](../../../../../../../docs/remote-control-program/README.md#browser-runtime)). `BrowserRuntimeProvider` in the layout of `/app` starts it.

## Parts

| Part                                                                                                                                                              | Location                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The orchestration of the log file connector, the local access layer and the channel client (`BrowserRuntime`), and the store of the own entries (`OwnEntryStore`) | `packages/remote-control-program-runtime/src/browserRuntime/`                         |
| The election of the tab with the Web Locks API, the messages between the tabs, the folder handle, the autostart                                                   | `BrowserRuntimeController.ts`, `tabMessages.ts`, `logFolder.ts`, `browserSettings.ts` |
| The token route and the key route of the app                                                                                                                      | `serverRequests.ts`                                                                   |
| The hooks                                                                                                                                                         | `useBrowserRuntime.ts`, the types in `types.ts`                                       |

## Tabs

- The tabs of one browser request the Web Lock `remote_control_program_browser_runtime`. The tab that holds it (the leader) runs the runtime.
- The leader sends its state and the own entries to the other tabs (the followers) through the BroadcastChannel with the same name. The followers send their commands to the leader through it (see `TabMessageType`).
- When the leader closes (`pagehide`), it ends its live period and writes its run record, and then releases the lock. The next tab gets the lock and continues: it starts when the previous runtime ran not more than 30 seconds before, else when the autostart is on. A stopped runtime stays stopped.

## Hooks

- `useBrowserRuntime()` gives `{ state, commands }`, or null when the user cannot use the Remote Control Program. See `BrowserRuntimeSnapshot` and `BrowserRuntimeCommands` in `types.ts`.
- `useLocalLogEntries()` gives the own entries of this browser by their key (`RawMatch.hash`). A follower keeps a copy of the entries only while a component uses the hook.
- Only `selectFolder()` and `restoreFolderPermission()` need a user gesture. Call them directly in the click handler.
- A failed command rejects with `BrowserRuntimeError` and its `BrowserRuntimeErrorCode`.

## Browser storage

| Key                                                                                | Storage                                   | Content                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `directory_handle`                                                                 | IndexedDB (default store of `idb-keyval`) | The handle of the log folder. The key of the old Log Analyzer.      |
| `is_autostart_enabled`                                                             | `localStorage`                            | The autostart. The key of the old Log Analyzer.                     |
| `remote_control_program_runtime_id`                                                | `localStorage`                            | The id of the runtime of this browser                               |
| `remote_control_program_browser_runtime_run`                                       | `localStorage`                            | The run record of the last runtime                                  |
| `remote_control_program_local_access_layer`, `remote_control_program_live_periods` | `localStorage`                            | The local access layer (see `localAccessStorage.ts` of the package) |
