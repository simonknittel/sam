import type { api, RouterOutputs } from "@/trpc/react";
import type { SharingOwner } from "@sam-monorepo/application";
import {
  CapabilityId,
  feedDeliveryEventPayloadSchema,
  type FeedDeliveryEventPayload,
} from "@sam-monorepo/domain";
import { TRPCClientError } from "@trpc/client";
import { toRelayLogFeedEntry, type RelayLogEntry } from "./logFeedEntry";
import {
  addRelayEntries,
  createRelayEntryFilter,
  EMPTY_RELAY_ENTRY_STORE,
  markRelayEntriesIncomplete,
  retainRelayEntries,
  type LogFeedScope,
  type RelayEntryStore,
} from "./mergeLogFeedEntries";
import type { RealtimeChannelHandlers } from "./realtimeChannel";

type TrpcClient = ReturnType<typeof api.useUtils>["client"];

/** The snapshot and the changes give the same page */
type FeedEntriesPage =
  RouterOutputs["remoteControlProgram"]["readFeedSnapshot"];

/**
 * The upper limit of the pages of one snapshot: 10,000 entries in pages of
 * 500 (`MAXIMUM_FEED_ENTRIES_PER_READ` of the application package). The
 * snapshot reads the newest entries first, thus the limit cuts the oldest
 * entries of a large window (see `RelayEntryStore.incompleteUntil`). A
 * window of the Log Analyzer usually has far fewer entries.
 */
const MAXIMUM_SNAPSHOT_PAGES = 20;

/**
 * More changes than a snapshot can hold come after a long gap. Then the
 * consumer reads a new snapshot, which gives the newest entries first.
 */
const MAXIMUM_CHANGES_PAGES = MAXIMUM_SNAPSHOT_PAGES;

/**
 * The renewal interval before the first answer of the app. The answer of
 * `renewWatchLease()` gives the interval of the application package.
 */
const DEFAULT_RENEWAL_INTERVAL_MILLISECONDS = 60_000;

/** The renewal and the list of the owners need some small queries */
const RENEWAL_TIMEOUT_MILLISECONDS = 10_000;

/** One page of 500 entries is below 1 MB */
const READ_TIMEOUT_MILLISECONDS = 20_000;

export enum RelayFeedAvailability {
  /** The first answer of the app is missing */
  Checking = "checking",
  /**
   * The app has no relay service, for example a preview deployment: the
   * consumer shows only the own entries of the browser runtime
   */
  NotConfigured = "not_configured",
  Available = "available",
}

export enum LogEntriesFeedProblem {
  /**
   * A request failed, for example without a network. The consumer tries
   * again at the next renewal.
   */
  RequestFailed = "request_failed",
  /**
   * The viewer has the maximum number of open consumers of the feed (see
   * `MAXIMUM_WATCH_LEASES_PER_VIEWER`), for example many open tabs. The relay
   * sends no new entries to this consumer: it reads them at each renewal.
   */
  TooManyConsumers = "too_many_consumers",
  /**
   * The viewer cannot read the feed: no citizen, no `remoteControlProgram;use`
   * or `logAnalyzer;read`, a switch is off, or an admin assumes the user
   */
  Forbidden = "forbidden",
}

/** The state shows the most severe problem */
const PROBLEM_SEVERITY: Record<LogEntriesFeedProblem, number> = {
  [LogEntriesFeedProblem.RequestFailed]: 0,
  [LogEntriesFeedProblem.TooManyConsumers]: 1,
  [LogEntriesFeedProblem.Forbidden]: 2,
};

enum ProblemSource {
  Lease = "lease",
  SharingOwners = "sharing_owners",
  Reads = "reads",
}

enum ReadOutcome {
  Completed = "completed",
  /** A new snapshot replaced the read */
  Superseded = "superseded",
  Failed = "failed",
  /** The consumer unmounted */
  Ended = "ended",
}

export interface LogEntriesFeedConsumerState {
  readonly scope: LogFeedScope;
  readonly relayEntries: RelayEntryStore;
  readonly relayAvailability: RelayFeedAvailability;
  /**
   * A snapshot is necessary or in progress: at the start, and after a change
   * of the scope or of the sharing owners
   */
  readonly isLoading: boolean;
  readonly problem: LogEntriesFeedProblem | null;
  /** The other owners who share with the viewer now, sorted by the handle */
  readonly sharingOwners: readonly SharingOwner[];
  /** More owners share than `sharingOwners` contains */
  readonly hasMoreSharingOwners: boolean;
}

/** The data of one mount of the consumer. A new mount starts a new session. */
interface Session {
  /** A random id for the watch lease, kept while the consumer is mounted */
  readonly consumerId: string;
  readonly ownCitizenId: string;
  /** Aborts the requests of the session when the consumer unmounts */
  readonly abortController: AbortController;
  renewalTimeout: number | undefined;
  renewalIntervalMilliseconds: number;
  isRenewalRunning: boolean;
  isRenewalRequested: boolean;
  /** A lease of this consumer can exist on the server */
  hasLease: boolean;
  /** The relay sends the new entries to the channel of this consumer */
  isLeaseValid: boolean;
  /**
   * The cursor of the changes. It moves only with the reads, never with a
   * realtime event. Null before the first page of the first snapshot.
   */
  cursor: string | null;
  /** The owners and their visible time ranges. Null before the first list. */
  sharingOwnersSignature: string | null;
  isSnapshotRequested: boolean;
  isChangesReadRequested: boolean;
  isSyncRunning: boolean;
  /** Aborts the current read when a new snapshot replaces it */
  readAbortController: AbortController | null;
}

const toProblem = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    const code: unknown = (error.data as { code?: unknown } | undefined)?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN")
      return LogEntriesFeedProblem.Forbidden;
    if (code === "CONFLICT") return LogEntriesFeedProblem.TooManyConsumers;
  }

  return LogEntriesFeedProblem.RequestFailed;
};

const isSameScope = (first: LogFeedScope, second: LogFeedScope) =>
  first.entryWindow.start?.getTime() === second.entryWindow.start?.getTime() &&
  first.entryWindow.end?.getTime() === second.entryWindow.end?.getTime() &&
  isSameOwners(first.ownerCitizenIds, second.ownerCitizenIds);

const isSameOwners = (
  first: readonly string[] | null,
  second: readonly string[] | null,
) =>
  first === second ||
  (first !== null &&
    second !== null &&
    first.length === second.length &&
    first.every((ownerCitizenId, index) => ownerCitizenId === second[index]));

/** A change of an owner or of a visible time range needs a new snapshot */
const createSharingOwnersSignature = (owners: readonly SharingOwner[]) =>
  owners
    .map(({ citizen, visibleTimeRange }) =>
      [
        citizen.id,
        visibleTimeRange.start?.toISOString(),
        visibleTimeRange.end?.toISOString(),
      ].join("|"),
    )
    .toSorted()
    .join(",");

const toDeliveredRelayLogEntries = (
  payload: FeedDeliveryEventPayload,
): RelayLogEntry[] => {
  switch (payload.capability_id) {
    case CapabilityId.LogEntries:
      return payload.entries.map((entry) => ({
        owner: entry.owner,
        type: entry.type,
        rawLine: entry.raw_line,
        eventAt: new Date(entry.event_at),
        lineNumber: entry.line_number,
        hash: entry.hash,
      }));

    default:
      throw new Error(
        `Unknown capability: ${payload.capability_id satisfies never}`,
      );
  }
};

/**
 * The relay part of the consumer client of `log_entries` (see
 * `useLogEntriesFeed()`): the watch lease, the snapshot with its cursor, the
 * realtime events of the own channel, and the reads of the changes since the
 * cursor. `useSyncExternalStore()` reads its state.
 *
 * The order: first the watch lease and the list of the sharing owners, then
 * the snapshot, thus no entry falls between the snapshot and the first
 * delivery. At each renewal of the lease, the consumer reads the list of
 * the sharing owners again. It reads the changes since the cursor when the
 * lease was not continuous, after each subscription of the channel (also
 * after a reconnect of the realtime service), after dropped entries of the
 * relay, and at each renewal while the realtime delivery does not work.
 */
export class LogEntriesFeedConsumer {
  readonly #client: TrpcClient;
  readonly #initialState: LogEntriesFeedConsumerState;
  #state: LogEntriesFeedConsumerState;
  readonly #listeners = new Set<() => void>();
  readonly #problems = new Map<ProblemSource, LogEntriesFeedProblem>();
  #session: Session | null = null;
  /** The subscription of the channel of the viewer is ready */
  #isRealtimeSubscribed = false;

  constructor(client: TrpcClient, scope: LogFeedScope) {
    this.#client = client;
    this.#initialState = {
      scope,
      relayEntries: EMPTY_RELAY_ENTRY_STORE,
      relayAvailability: RelayFeedAvailability.Checking,
      isLoading: true,
      problem: null,
      sharingOwners: [],
      hasMoreSharingOwners: false,
    };
    this.#state = this.#initialState;
  }

  /** For `useSyncExternalStore()` */
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#state;

  getServerSnapshot = () => this.#initialState;

  /** For `watchRealtimeChannel()` on the channel of the own citizen */
  readonly realtimeHandlers: RealtimeChannelHandlers = {
    onEvent: (data) => {
      this.#handleRealtimeEvent(data);
    },
    onSubscribed: () => {
      this.#isRealtimeSubscribed = true;
      if (this.#session) this.#requestChanges(this.#session);
    },
    onUnsubscribed: () => {
      this.#isRealtimeSubscribed = false;
    },
  };

  /** Starts a new session with a new consumer id */
  start(ownCitizenId: string) {
    this.stop();

    const session: Session = {
      consumerId: crypto.randomUUID(),
      ownCitizenId,
      abortController: new AbortController(),
      renewalTimeout: undefined,
      renewalIntervalMilliseconds: DEFAULT_RENEWAL_INTERVAL_MILLISECONDS,
      isRenewalRunning: false,
      isRenewalRequested: false,
      hasLease: false,
      isLeaseValid: false,
      cursor: null,
      sharingOwnersSignature: null,
      isSnapshotRequested: false,
      isChangesReadRequested: false,
      isSyncRunning: false,
      readAbortController: null,
    };
    this.#session = session;
    this.#problems.clear();
    this.#setState({ ...this.#initialState, scope: this.#state.scope });

    window.addEventListener("pagehide", this.#handlePageHide);
    window.addEventListener("pageshow", this.#handlePageShow);

    void this.#renew(session);
  }

  /** Ends the session and its watch lease */
  stop() {
    const session = this.#session;
    if (!session) return;

    this.#session = null;
    session.abortController.abort();
    window.clearTimeout(session.renewalTimeout);
    window.removeEventListener("pagehide", this.#handlePageHide);
    window.removeEventListener("pageshow", this.#handlePageShow);

    if (session.hasLease) this.#endLease(session);
  }

  /** A different window or different owners need a new snapshot */
  setScope(scope: LogFeedScope) {
    const previousScope = this.#state.scope;
    if (isSameScope(previousScope, scope)) return;

    this.#setState({ scope });

    const session = this.#session;
    if (
      !session ||
      this.#state.relayAvailability === RelayFeedAvailability.NotConfigured
    )
      return;

    // The lease contains the owners
    if (!isSameOwners(previousScope.ownerCitizenIds, scope.ownerCitizenIds))
      void this.#renew(session);

    // Before the first lease, the first renewal requests the first snapshot
    if (this.#state.relayAvailability === RelayFeedAvailability.Available)
      this.#requestSnapshot(session);
  }

  #setState(partialState: Partial<LogEntriesFeedConsumerState>) {
    this.#state = { ...this.#state, ...partialState };
    for (const listener of this.#listeners) listener();
  }

  #setProblem(source: ProblemSource, problem: LogEntriesFeedProblem | null) {
    if (problem === null) this.#problems.delete(source);
    else this.#problems.set(source, problem);

    let mostSevereProblem: LogEntriesFeedProblem | null = null;
    for (const candidate of this.#problems.values())
      if (
        mostSevereProblem === null ||
        PROBLEM_SEVERITY[candidate] > PROBLEM_SEVERITY[mostSevereProblem]
      )
        mostSevereProblem = candidate;

    if (mostSevereProblem !== this.#state.problem)
      this.#setState({ problem: mostSevereProblem });
  }

  #isCurrent(session: Session) {
    return this.#session === session;
  }

  #createSignal(session: Session, timeoutMilliseconds: number) {
    return AbortSignal.any([
      session.abortController.signal,
      AbortSignal.timeout(timeoutMilliseconds),
    ]);
  }

  /**
   * Renews the watch lease and reads the list of the sharing owners, then
   * plans the next renewal
   */
  async #renew(session: Session) {
    if (session.isRenewalRunning) {
      session.isRenewalRequested = true;
      return;
    }

    session.isRenewalRunning = true;
    window.clearTimeout(session.renewalTimeout);

    const signal = this.#createSignal(session, RENEWAL_TIMEOUT_MILLISECONDS);
    const [leaseResult, sharingOwnersResult] = await Promise.allSettled([
      this.#client.remoteControlProgram.renewWatchLease.mutate(
        {
          consumer_id: session.consumerId,
          capability_id: CapabilityId.LogEntries,
          owner_citizen_ids: [...(this.#state.scope.ownerCitizenIds ?? [])],
        },
        { signal },
      ),
      this.#client.remoteControlProgram.listSharingOwners.query(
        { capability_id: CapabilityId.LogEntries },
        { signal },
      ),
    ]);
    if (!this.#isCurrent(session)) return;

    session.isRenewalRunning = false;

    if (leaseResult.status === "fulfilled") {
      const { lease } = leaseResult.value;
      if (lease === null) {
        this.#setProblem(ProblemSource.Lease, null);
        this.#setState({
          relayAvailability: RelayFeedAvailability.NotConfigured,
          isLoading: false,
        });
        // Without a relay service, nothing changes until the next deploy
        return;
      }

      session.hasLease = true;
      session.isLeaseValid = true;
      session.renewalIntervalMilliseconds = lease.renewalIntervalMilliseconds;
      this.#setProblem(ProblemSource.Lease, null);
      this.#setState({ relayAvailability: RelayFeedAvailability.Available });
      if (!lease.isContinuous) this.#requestChanges(session);
    } else {
      const problem = toProblem(leaseResult.reason);
      session.isLeaseValid = false;
      this.#setProblem(ProblemSource.Lease, problem);
      // The use case refused the lease, thus the app has a relay service
      if (problem !== LogEntriesFeedProblem.RequestFailed)
        this.#setState({ relayAvailability: RelayFeedAvailability.Available });
    }

    if (sharingOwnersResult.status === "fulfilled") {
      this.#applySharingOwners(session, sharingOwnersResult.value);
      this.#setProblem(ProblemSource.SharingOwners, null);
    } else {
      this.#setProblem(
        ProblemSource.SharingOwners,
        toProblem(sharingOwnersResult.reason),
      );
    }

    const isForbidden = [ProblemSource.Lease, ProblemSource.SharingOwners].some(
      (source) =>
        this.#problems.get(source) === LogEntriesFeedProblem.Forbidden,
    );
    if (isForbidden) {
      this.#setState({ isLoading: false });
    } else if (
      this.#state.relayAvailability === RelayFeedAvailability.Available
    ) {
      if (
        session.cursor === null &&
        !session.isSnapshotRequested &&
        !session.isSyncRunning
      )
        this.#requestSnapshot(session);

      // Without the realtime delivery, the renewal reads the new entries
      if (!this.#isRealtimeSubscribed || !session.isLeaseValid)
        this.#requestChanges(session);

      void this.#sync(session);
    }

    session.renewalTimeout = window.setTimeout(() => {
      void this.#renew(session);
    }, session.renewalIntervalMilliseconds);

    if (session.isRenewalRequested) {
      session.isRenewalRequested = false;
      void this.#renew(session);
    }
  }

  #applySharingOwners(
    session: Session,
    {
      owners,
      hasMoreOwners,
    }: { readonly owners: SharingOwner[]; readonly hasMoreOwners: boolean },
  ) {
    const signature = createSharingOwnersSignature(owners);
    const previousSignature = session.sharingOwnersSignature;
    session.sharingOwnersSignature = signature;
    this.#setState({
      sharingOwners: owners,
      hasMoreSharingOwners: hasMoreOwners,
    });

    if (previousSignature === null || previousSignature === signature) return;

    // The entries of an owner without access leave at once. A new grant does not add the older entries to the changes.
    this.#retainVisibleRelayEntries(session);
    this.#requestSnapshot(session);
  }

  #retainVisibleRelayEntries(session: Session) {
    const { scope, relayEntries, sharingOwners, hasMoreSharingOwners } =
      this.#state;
    const filter = createRelayEntryFilter({
      scope,
      ownCitizenId: session.ownCitizenId,
      sharingOwners:
        session.sharingOwnersSignature === null || hasMoreSharingOwners
          ? null
          : sharingOwners,
    });

    this.#setState({ relayEntries: retainRelayEntries(relayEntries, filter) });
  }

  #addRelayEntries(session: Session, entries: readonly RelayLogEntry[]) {
    const filter = createRelayEntryFilter({
      scope: this.#state.scope,
      ownCitizenId: session.ownCitizenId,
      // A new grant can deliver entries before the next list of the owners
      sharingOwners: null,
    });
    const feedEntries = entries.flatMap((entry) => {
      const feedEntry = toRelayLogFeedEntry(entry);
      return feedEntry && filter(feedEntry) ? [feedEntry] : [];
    });

    const relayEntries = addRelayEntries(this.#state.relayEntries, feedEntries);
    if (relayEntries !== this.#state.relayEntries)
      this.#setState({ relayEntries });
  }

  #endLease(session: Session) {
    session.hasLease = false;
    session.isLeaseValid = false;

    // Best effort: without the end, the lease expires after some minutes
    void this.#client.remoteControlProgram.endWatchLease
      .mutate(
        {
          consumer_id: session.consumerId,
          capability_id: CapabilityId.LogEntries,
        },
        { signal: AbortSignal.timeout(RENEWAL_TIMEOUT_MILLISECONDS) },
      )
      .catch(() => undefined);
  }

  /** The page goes into the back-forward cache, or it closes */
  #handlePageHide = () => {
    const session = this.#session;
    if (session?.hasLease) this.#endLease(session);
  };

  /** The page comes back from the back-forward cache */
  #handlePageShow = (event: PageTransitionEvent) => {
    const session = this.#session;
    if (session && event.persisted) void this.#renew(session);
  };

  #handleRealtimeEvent(data: unknown) {
    const session = this.#session;
    if (!session) return;

    const result = feedDeliveryEventPayloadSchema.safeParse(data);
    if (!result.success) return;

    this.#addRelayEntries(session, toDeliveredRelayLogEntries(result.data));
    if (result.data.dropped_entry_count > 0) this.#requestChanges(session);
  }

  #requestSnapshot(session: Session) {
    session.isSnapshotRequested = true;
    session.readAbortController?.abort();
    this.#setState({ isLoading: true });
    void this.#sync(session);
  }

  #requestChanges(session: Session) {
    session.isChangesReadRequested = true;
    void this.#sync(session);
  }

  /**
   * Runs the requested reads one after the other. A snapshot comes first, and
   * it covers the changes that were requested before it. A failed read waits
   * for the next renewal.
   */
  async #sync(session: Session) {
    if (session.isSyncRunning) return;
    session.isSyncRunning = true;

    let outcome = ReadOutcome.Completed;
    while (
      this.#isCurrent(session) &&
      outcome !== ReadOutcome.Failed &&
      outcome !== ReadOutcome.Ended
    ) {
      if (session.isSnapshotRequested) {
        session.isSnapshotRequested = false;
        session.isChangesReadRequested = false;
        outcome = await this.#readSnapshot(session);
        if (outcome === ReadOutcome.Failed) session.isSnapshotRequested = true;
      } else if (session.isChangesReadRequested && session.cursor !== null) {
        session.isChangesReadRequested = false;
        outcome = await this.#readChanges(session, session.cursor);
        if (outcome === ReadOutcome.Failed)
          session.isChangesReadRequested = true;
      } else {
        break;
      }
    }

    session.isSyncRunning = false;
  }

  #startRead(session: Session) {
    const readAbortController = new AbortController();
    session.readAbortController = readAbortController;

    return {
      readAbortController,
      signal: AbortSignal.any([
        readAbortController.signal,
        this.#createSignal(session, READ_TIMEOUT_MILLISECONDS),
      ]),
    };
  }

  #getReadOutcomeAfterError(
    session: Session,
    readAbortController: AbortController,
    error: unknown,
  ) {
    if (!this.#isCurrent(session)) return ReadOutcome.Ended;
    if (readAbortController.signal.aborted) return ReadOutcome.Superseded;

    this.#setProblem(ProblemSource.Reads, toProblem(error));
    this.#setState({ isLoading: false });
    return ReadOutcome.Failed;
  }

  async #readSnapshot(session: Session): Promise<ReadOutcome> {
    const { readAbortController, signal } = this.#startRead(session);
    const { start, end } = this.#state.scope.entryWindow;

    this.#retainVisibleRelayEntries(session);
    this.#setState({
      isLoading: true,
      relayEntries: {
        entries: this.#state.relayEntries.entries,
        incompleteUntil: null,
      },
    });

    let pageCursor: string | undefined;
    let oldestEventAt: Date | null = null;

    for (
      let pageIndex = 0;
      pageIndex < MAXIMUM_SNAPSHOT_PAGES;
      pageIndex += 1
    ) {
      let page: FeedEntriesPage;
      try {
        page = await this.#client.remoteControlProgram.readFeedSnapshot.query(
          {
            start: start ?? undefined,
            end: end ?? undefined,
            page_cursor: pageCursor,
          },
          { signal },
        );
      } catch (error) {
        return this.#getReadOutcomeAfterError(
          session,
          readAbortController,
          error,
        );
      }
      if (!this.#isCurrent(session)) return ReadOutcome.Ended;
      if (readAbortController.signal.aborted) return ReadOutcome.Superseded;

      // The cursor of the first page covers all pages
      if (pageIndex === 0) session.cursor = page.cursor;
      this.#addRelayEntries(session, page.entries);
      oldestEventAt = page.entries.at(-1)?.eventAt ?? oldestEventAt;

      if (!page.hasMore || page.nextPageCursor === null) {
        this.#completeRead();
        return ReadOutcome.Completed;
      }
      pageCursor = page.nextPageCursor;
    }

    if (oldestEventAt !== null)
      this.#setState({
        relayEntries: markRelayEntriesIncomplete(
          this.#state.relayEntries,
          oldestEventAt,
        ),
      });
    this.#completeRead();
    return ReadOutcome.Completed;
  }

  async #readChanges(session: Session, cursor: string): Promise<ReadOutcome> {
    const { readAbortController, signal } = this.#startRead(session);
    const { start, end } = this.#state.scope.entryWindow;
    let pageCursor = cursor;

    for (let pageIndex = 0; ; pageIndex += 1) {
      if (pageIndex >= MAXIMUM_CHANGES_PAGES) {
        this.#requestSnapshot(session);
        return ReadOutcome.Completed;
      }

      let page: FeedEntriesPage;
      try {
        page = await this.#client.remoteControlProgram.readFeedChanges.query(
          {
            start: start ?? undefined,
            end: end ?? undefined,
            cursor: pageCursor,
          },
          { signal },
        );
      } catch (error) {
        return this.#getReadOutcomeAfterError(
          session,
          readAbortController,
          error,
        );
      }
      if (!this.#isCurrent(session)) return ReadOutcome.Ended;
      if (readAbortController.signal.aborted) return ReadOutcome.Superseded;

      session.cursor = page.cursor;
      pageCursor = page.cursor;
      this.#addRelayEntries(session, page.entries);

      if (!page.hasMore) {
        this.#completeRead();
        return ReadOutcome.Completed;
      }
    }
  }

  #completeRead() {
    this.#setProblem(ProblemSource.Reads, null);
    if (this.#state.isLoading && !this.#session?.isSnapshotRequested)
      this.#setState({ isLoading: false });
  }
}
