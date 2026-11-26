# Browser runtime

The browser runtime of the Remote Control Program runs on all SAM pages for a user with `remoteControlProgram;use` (see [Browser runtime](../../../../../../../docs/remote-control-program/README.md#browser-runtime)). `BrowserRuntimeProvider` in the layout of `/app` starts it. The layout gives the citizen of the session to the provider only when `canUseRemoteControlProgram()` of the server is true. The provider also holds the open state of the sharing popover (`SharingPopoverProvider` in `../components/sharing-popover/`).

## Parts

| Part                                                                                                                                                              | Location                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The orchestration of the log file connector, the local access layer and the channel client (`BrowserRuntime`), and the store of the own entries (`OwnEntryStore`) | `packages/remote-control-program-runtime/src/browserRuntime/`                                           |
| The election of the tab with the Web Locks API, the messages and the commands between the tabs, the folder handle, the autostart                                  | `BrowserRuntimeController.ts`, `tabMessages.ts`, `tabCommands.ts`, `logFolder.ts`, `browserSettings.ts` |
| The token route of the app and the tRPC query of the keys                                                                                                         | `serverRequests.ts`                                                                                     |
| The hooks                                                                                                                                                         | `useBrowserRuntime.ts`, the types in `types.ts`                                                         |

## Citizens

- Each citizen has an own runtime in the browser. Each value in the browser storage, the Web Lock and the BroadcastChannel have the citizen id in their name (`toCitizenKey()` of the package). Thus a citizen who logs in after a different citizen in the same browser profile never uploads with the settings, the live periods or the log folder of the other citizen.
- The folder handle and the autostart of the old Log Analyzer go to the first citizen whose runtime starts in the browser. Then the old keys go away.
- The logout (`useEndBrowserRuntimeSession()` before `signOut()`) stops the runtime without a continuation in all tabs of the citizen.
- The runtime does not use a connection token of a different citizen: after a login with a different account in a different tab, it ends with `ChannelEndReason.CitizenChanged`.

## Tabs

- The tabs of a citizen in one browser request the Web Lock of the citizen (`getBrowserRuntimeChannelName()` in `tabMessages.ts`). The tab that holds it (the leader) runs the runtime.
- The leader sends its state and the own entries to the other tabs (the followers) through the BroadcastChannel with the same name. The followers send their commands to it (see `TabMessageType`). A command fails with `NoAnswer` when a different tab becomes the leader.
- When the leader closes (`pagehide`), it ends its live period and writes its run record, and then releases the lock. The next tab gets the lock and continues: it starts when the previous runtime ran a short time before (`TAB_CHANGE_GAP_MILLISECONDS` of the package), else when the autostart is on. It also continues the live period, thus the change of the active tab makes no gap in the upload. A stopped runtime stays stopped.
- A stop of the owner (`stop()`), a logout, or a lost access to the folder ends the live period without a continuation. The Unleash flag that turns off the Remote Control Program and a different log folder remove all live periods. Thus the entries of the stopped time stay on the machine (decision 27 of the concept).

## Hooks

- `useIsRemoteControlProgramAvailable()` is the gate of the items of the shell: true when the layout enabled the provider.
- `useBrowserRuntime()` gives `{ state, commands }`, or null when the user cannot use the Remote Control Program. See `BrowserRuntimeSnapshot` and `BrowserRuntimeCommands` in `types.ts`. `state.runtimeId` is the id of the runtime of this browser (the sharing popover marks it). `state.channel` tells the connection to the relay: the status `Ended` with its `closeReason` tells why this browser uploads nothing.
- `useLocalLogEntries()` gives the own entries of this browser by their key (`RawMatch.hash`). A follower keeps a copy of the entries only while a component uses the hook.
- `useEndBrowserRuntimeSession()` gives the function for the logout.
- Only `selectFolder()` and `restoreFolderPermission()` need a user gesture. Call them directly in the click handler.
- A failed command rejects with `BrowserRuntimeError` and its `BrowserRuntimeErrorCode`.
- Only the settings of the log file connector in the sharing popover call `prepareOlderEntriesRequest()` (`../components/sharing-popover/OlderEntriesUpload.tsx`). They show the count and upload the entries only after the confirmation of the owner.

## Browser storage

The names are in the files of the table. Each name ends with `:<citizen id>`.

| Value                                                  | Storage                                   | File                                   |
| ------------------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| The handle of the log folder                           | IndexedDB (default store of `idb-keyval`) | `logFolder.ts`                         |
| The autostart and the id of the runtime                | `localStorage`                            | `browserSettings.ts`                   |
| The run record of the last runtime                     | `localStorage`                            | `runRecord.ts` of the package          |
| The local access layer: the rules and the live periods | `localStorage`                            | `localAccessStorage.ts` of the package |
