"use client";

import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import {
  WikiSaveState,
  parseWikiCollabStatelessMessage,
  serializeWikiCollabStatelessMessage,
} from "@sam-monorepo/wiki-editor";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { WikiSaveStateIndicator } from "./WikiSaveStateIndicator";

interface Props {
  readonly className?: string;
  readonly provider: HocuspocusProvider;
  readonly status: WebSocketStatus;
}

/**
 * Save state of the collaborative editor. The collab server is the
 * authority — it broadcasts dirty/saving/saved around its debounced
 * database store (see apps/collab) — with local changes the server hasn't
 * received layered on top. Clicking asks the server to persist pending
 * changes immediately.
 */
export const WikiCollabSaveIndicator = ({
  className,
  provider,
  status,
}: Props) => {
  const [serverState, setServerState] = useState(WikiSaveState.Saved);

  useEffect(() => {
    const handleStateless = ({ payload }: { payload: string }) => {
      const message = parseWikiCollabStatelessMessage(payload);
      if (message?.type === "saveState") setServerState(message.state);
    };

    provider.on("stateless", handleStateless);
    return () => {
      provider.off("stateless", handleStateless);
    };
  }, [provider]);

  /**
   * Local changes the server hasn't acknowledged. Only meaningful while
   * the connection is down: while connected they are acknowledged within
   * milliseconds (and the server broadcasts "dirty" anyway), and during
   * the (re)connect handshake the provider counts the sync request itself
   * as an unsynced change, which must not show as unsaved changes.
   */
  const hasUnsyncedChanges = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        provider.on("unsyncedChanges", onStoreChange);
        return () => provider.off("unsyncedChanges", onStoreChange);
      },
      [provider],
    ),
    () => provider.hasUnsyncedChanges,
    () => false,
  );

  const isConnected = status === WebSocketStatus.Connected;
  const state =
    !isConnected && hasUnsyncedChanges ? WikiSaveState.Dirty : serverState;

  const handleForceSave = useCallback(() => {
    provider.sendStateless(
      serializeWikiCollabStatelessMessage({ type: "forceSave" }),
    );
  }, [provider]);

  return (
    <WikiSaveStateIndicator
      className={className}
      state={state}
      disabled={!isConnected}
      onForceSave={handleForceSave}
    />
  );
};
