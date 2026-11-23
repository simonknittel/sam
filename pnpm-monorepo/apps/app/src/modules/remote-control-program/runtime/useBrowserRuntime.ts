import type { RawMatch } from "@sam-monorepo/remote-control-program-runtime";
import { useContext, useSyncExternalStore } from "react";
import { BrowserRuntimeContext } from "./BrowserRuntimeProvider";
import type { BrowserRuntimeHandle } from "./types";

/** Without a runtime, the value never changes */
const subscribeToNothing = () => () => undefined;

const NO_ENTRIES: ReadonlyMap<string, RawMatch> = new Map();

/**
 * The gate of the items of the Remote Control Program in the shell: true when
 * the layout enabled the runtime provider, thus when the server decided
 * `canUseRemoteControlProgram()` for the user. The browser does not check the
 * permission itself.
 */
export const useIsRemoteControlProgramAvailable = () =>
  useContext(BrowserRuntimeContext) !== null;

/**
 * The state and the commands of the browser runtime of this browser, in each
 * tab. Null when the user cannot use the Remote Control Program (see
 * `README.md`).
 */
export const useBrowserRuntime = (): BrowserRuntimeHandle | null => {
  const controller = useContext(BrowserRuntimeContext);

  const state = useSyncExternalStore(
    controller?.subscribe ?? subscribeToNothing,
    () => controller?.getSnapshot() ?? null,
    () => controller?.getServerSnapshot() ?? null,
  );

  if (controller === null || state === null) return null;
  return { state, commands: controller.commands };
};

/**
 * For the logout, before the end of the session: the runtime of the citizen
 * stops without a continuation in all tabs of this browser (see
 * `BrowserRuntimeController.endSession()`). Thus it does not read or upload
 * for a different citizen who logs in next in the same browser.
 */
export const useEndBrowserRuntimeSession = () => {
  const controller = useContext(BrowserRuntimeContext);

  return () => controller?.endSession();
};

/**
 * The own entries of this browser by their key (`RawMatch.hash`), from the
 * tab of the runtime. Empty when the user cannot use the Remote Control
 * Program. The map changes only with the entries.
 */
export const useLocalLogEntries = (): ReadonlyMap<string, RawMatch> => {
  const controller = useContext(BrowserRuntimeContext);

  return useSyncExternalStore(
    controller?.subscribeEntries ?? subscribeToNothing,
    () => controller?.getEntriesSnapshot() ?? NO_ENTRIES,
    () => NO_ENTRIES,
  );
};
