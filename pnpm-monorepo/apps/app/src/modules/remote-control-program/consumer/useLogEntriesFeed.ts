import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { useChannelsContext } from "@/modules/pusher/components/ChannelsContext";
import { api } from "@/trpc/react";
import type { SharingOwner } from "@sam-monorepo/application";
import {
  FEED_DELIVERY_EVENT_NAME,
  getRemoteControlProgramChannelName,
} from "@sam-monorepo/domain";
import type { EntryWindow } from "@sam-monorepo/remote-control-program-runtime";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BrowserRuntimeTabRole,
  type BrowserRuntimeCommands,
} from "../runtime/types";
import {
  useBrowserRuntime,
  useLocalLogEntries,
} from "../runtime/useBrowserRuntime";
import {
  LogEntriesFeedConsumer,
  LogEntriesFeedProblem,
  RelayFeedAvailability,
} from "./LogEntriesFeedConsumer";
import {
  getLogEntryUploadState,
  type LogEntryUploadState,
} from "./logEntryUploadState";
import type { LogFeedEntry } from "./logFeedEntry";
import {
  mergeLogFeedEntries,
  toLocalLogFeedEntries,
} from "./mergeLogFeedEntries";
import { watchRealtimeChannel } from "./realtimeChannel";

export interface LogEntriesFeedOptions {
  /**
   * The time window of the entries (the time of the observation, `end`
   * exclusive). The hook compares it by its times, thus a new object with
   * the same times changes nothing. The browser runtime also reads the log
   * files of this window.
   */
  readonly entryWindow: EntryWindow;
  /**
   * The owners whose entries the consumer shows, a maximum of 100
   * (`MAXIMUM_WATCHED_OWNERS`). Null: the own entries and the entries of all
   * owners who share with the viewer.
   */
  readonly ownerCitizenIds?: readonly string[] | null;
}

export interface LogEntriesFeed {
  /**
   * The entries of the window and the owners, from the oldest to the newest
   * (`compareLogFeedEntries()`), one entry for each key
   */
  readonly entries: readonly LogFeedEntry[];
  readonly getUploadState: (entry: LogFeedEntry) => LogEntryUploadState;
  /**
   * A snapshot of the relay is necessary or in progress. The entries of the
   * browser runtime and the first pages of the snapshot are in `entries`.
   */
  readonly isLoading: boolean;
  /**
   * `NotConfigured`: the app has no relay service, thus `entries` contains
   * only the own entries of this browser. Show a note.
   */
  readonly relayAvailability: RelayFeedAvailability;
  readonly problem: LogEntriesFeedProblem | null;
  /**
   * Null: the consumer has all entries of the relay in the window. Else,
   * the window has more entries of the relay than the consumer keeps: the
   * entries up to this time can be missing.
   */
  readonly incompleteUntil: Date | null;
  /** The other owners who share with the viewer now, sorted by the handle */
  readonly sharingOwners: readonly SharingOwner[];
  /** More owners share than `sharingOwners` contains */
  readonly hasMoreSharingOwners: boolean;
}

/** The runtime of a different tab can close before it answers */
const requestWindow = (
  commands: BrowserRuntimeCommands,
  entryWindow: EntryWindow | null,
) => {
  // The next tab role gives the window again
  void commands.setRequestedWindow(entryWindow).catch(() => undefined);
};

/**
 * The consumer client of the feed `log_entries` for a control UI, for
 * example the Log Analyzer (see "Delivery to the consumers" of
 * `docs/remote-control-program/README.md`). It combines the own entries of
 * the browser runtime of this browser (`useLocalLogEntries()`) and the
 * entries of the relay: the own entries of the other machines, and the
 * entries of the other owners. It removes the duplicates by the owner and
 * the hash. See `LogEntriesFeedConsumer` for the reads of the relay.
 *
 * Use it in one component of a control UI, and give its value to the other
 * components: each use registers its own watch lease.
 */
export const useLogEntriesFeed = ({
  entryWindow,
  ownerCitizenIds = null,
}: LogEntriesFeedOptions): LogEntriesFeed => {
  const authentication = useAuthentication();
  const ownCitizen = authentication ? authentication.session.entity : null;
  const ownCitizenId = ownCitizen?.id ?? null;
  const ownCitizenHandle = ownCitizen?.handle ?? null;

  const utils = api.useUtils();
  const { client: realtimeClient } = useChannelsContext();
  const runtime = useBrowserRuntime();
  const localMatches = useLocalLogEntries();

  const [consumer] = useState(
    () =>
      new LogEntriesFeedConsumer(utils.client, {
        entryWindow,
        ownerCitizenIds,
      }),
  );
  const state = useSyncExternalStore(
    consumer.subscribe,
    consumer.getSnapshot,
    consumer.getServerSnapshot,
  );

  useEffect(() => {
    consumer.setScope({ entryWindow, ownerCitizenIds });
  }, [consumer, entryWindow, ownerCitizenIds]);

  useEffect(() => {
    if (ownCitizenId === null) return;

    consumer.start(ownCitizenId);
    return () => {
      consumer.stop();
    };
  }, [consumer, ownCitizenId]);

  useEffect(() => {
    if (realtimeClient === null || ownCitizenId === null) return;

    return watchRealtimeChannel(
      realtimeClient,
      getRemoteControlProgramChannelName(ownCitizenId),
      FEED_DELIVERY_EVENT_NAME,
      consumer.realtimeHandlers,
    );
  }, [consumer, realtimeClient, ownCitizenId]);

  const commands = runtime?.commands ?? null;
  const tabRole = runtime?.state.tabRole ?? BrowserRuntimeTabRole.Inactive;
  // The consumer keeps the window of the same times as one object
  const requestedWindow = state.scope.entryWindow;

  useEffect(() => {
    // A new runtime does not know the window: a new role gives it again
    if (commands === null || tabRole === BrowserRuntimeTabRole.Inactive) return;

    requestWindow(commands, requestedWindow);
  }, [commands, tabRole, requestedWindow]);

  useEffect(() => {
    if (commands === null) return;

    return () => {
      requestWindow(commands, null);
    };
  }, [commands]);

  const owner =
    ownCitizenId === null
      ? null
      : { id: ownCitizenId, handle: ownCitizenHandle };
  const entries = mergeLogFeedEntries({
    localEntries: toLocalLogFeedEntries(localMatches, owner),
    relayEntries: state.relayEntries.entries,
    scope: state.scope,
  });

  const getUploadState = (entry: LogFeedEntry) =>
    getLogEntryUploadState(entry, {
      ...state.relayEntries,
      isUpToDate:
        state.relayAvailability === RelayFeedAvailability.Available &&
        !state.isLoading &&
        !state.isCatchingUp &&
        state.problem === null,
    });

  // The use cases refuse each read without a citizen
  if (ownCitizenId === null)
    return {
      entries,
      getUploadState,
      isLoading: false,
      relayAvailability: state.relayAvailability,
      problem: LogEntriesFeedProblem.Forbidden,
      incompleteUntil: null,
      sharingOwners: [],
      hasMoreSharingOwners: false,
    };

  return {
    entries,
    getUploadState,
    isLoading: state.isLoading,
    relayAvailability: state.relayAvailability,
    problem: state.problem,
    incompleteUntil: state.relayEntries.incompleteUntil,
    sharingOwners: state.sharingOwners,
    hasMoreSharingOwners: state.hasMoreSharingOwners,
  };
};
