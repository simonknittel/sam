import type { AppRouter } from "@/server/api/root";
import type { api, RouterOutputs } from "@/trpc/react";
import type { SharingOwner, SharingOwners } from "@sam-monorepo/application";
import {
  CapabilityId,
  feedDeliveryEventPayloadSchema,
  getLogAnalyzerHistoryEnd,
  type FeedDeliveryEventPayload,
} from "@sam-monorepo/domain";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
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

/** One page of a snapshot (without `cursor`), or of the changes since `cursor` */
type FeedEntriesInput =
  inferRouterInputs<AppRouter>["remoteControlProgram"]["readFeedEntries"];

type FeedEntriesPage = RouterOutputs["remoteControlProgram"]["readFeedEntries"];

/**
 * The upper limit of the pages of one read: 10,000 entries in pages of 500
 * (`MAXIMUM_FEED_ENTRIES_PER_READ` of the application package). The snapshot
 * reads the newest entries first, thus the limit cuts the oldest entries of
 * a large window (see `RelayEntryStore.incompleteUntil`). A window of the
 * Log Analyzer usually has far fewer entries. More changes than a snapshot
 * can hold come after a long gap: then the consumer reads a new snapshot,
 * which gives the newest entries first.
 */
const MAXIMUM_PAGES_PER_READ = 20;

/**
 * The renewal interval before the first answer of the app. The answer of
 * `renewWatchLease()` gives the interval of the application package.
 */
const DEFAULT_RENEWAL_INTERVAL_MILLISECONDS = 60_000;

/**
 * The interval of the reads of the sharing owners, separate from the
 * renewal of the lease: when a grant ends, the entries of its owner leave
 * the view within this time (principle 5)
 */
const SHARING_OWNERS_READ_INTERVAL_MILLISECONDS = 15_000;

/**
 * An open view gets no event when an entry becomes history (decision 31),
 * thus it reads the entries that crossed the limit at this interval
 */
const HISTORY_READ_INTERVAL_MILLISECONDS = 5 * 60_000;

/**
 * The read of the history starts this time before the end of the read before
 * it: the app applies the limit with its own clock, and the clock of the
 * browser can be wrong by some minutes
 */
const HISTORY_READ_OVERLAP_MILLISECONDS = 30 * 60_000;

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
   * or `logAnalyzer;read`, the program is off, or an admin assumes the user
   */
  Forbidden = "forbidden",
  /** The session of the browser ended: the user must log in again */
  SessionExpired = "session_expired",
}

/** The state shows the most severe problem */
const PROBLEM_SEVERITY: Record<LogEntriesFeedProblem, number> = {
  [LogEntriesFeedProblem.RequestFailed]: 0,
  [LogEntriesFeedProblem.TooManyConsumers]: 1,
  [LogEntriesFeedProblem.Forbidden]: 2,
  [LogEntriesFeedProblem.SessionExpired]: 3,
};

/** The viewer cannot read the entries of the other owners */
const isAccessProblem = (problem: LogEntriesFeedProblem | null | undefined) =>
  problem === LogEntriesFeedProblem.Forbidden ||
  problem === LogEntriesFeedProblem.SessionExpired;

enum ProblemSource {
  Lease = "lease",
  SharingOwners = "sharing_owners",
  Reads = "reads",
}

enum ReadOutcome {
  Completed = "completed",
  /** The read stopped at `MAXIMUM_PAGES_PER_READ`, and there are more pages */
  Truncated = "truncated",
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
  /**
   * The realtime delivery does not work, or a read of the changes since the
   * last delivery is necessary or in progress: new entries can be missing
   */
  readonly isCatchingUp: boolean;
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
  sharingOwnersTimeout: number | undefined;
  isSharingOwnersReadRunning: boolean;
  /**
   * The cursor of the changes. It moves only with the reads, never with a
   * realtime event. Null before the first page of the first snapshot.
   */
  cursor: string | null;
  historyTimeout: number | undefined;
  /** The end of the last read of the history. Null before the first snapshot. */
  historyReadUntil: Date | null;
  /** The owners and their visible time ranges. Null before the first list. */
  sharingOwnersSignature: string | null;
  /**
   * The other owners of the live entries of the last full snapshot. The
   * snapshot gives only the entries that the viewer can read, thus it
   * confirms the grants of the owners that the list of the sharing owners
   * does not contain (`hasMoreSharingOwners`).
   */
  snapshotOwnerCitizenIds: ReadonlySet<string>;
  isSnapshotRequested: boolean;
  isChangesReadRequested: boolean;
  isHistoryReadRequested: boolean;
  isSyncRunning: boolean;
  /** Aborts the current read when a new snapshot replaces it */
  readAbortController: AbortController | null;
}

/** What a snapshot learns from its pages */
interface SnapshotProgress {
  /** The snapshot reads the newest entries first */
  oldestEventAt: Date | null;
  readonly ownerCitizenIds: Set<string>;
}

const toProblem = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    const code: unknown = (error.data as { code?: unknown } | undefined)?.code;
    if (code === "UNAUTHORIZED") return LogEntriesFeedProblem.SessionExpired;
    if (code === "FORBIDDEN") return LogEntriesFeedProblem.Forbidden;
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

/** Null after the last page of the read */
const getNextPageInput = (
  input: FeedEntriesInput,
  page: FeedEntriesPage,
): FeedEntriesInput | null => {
  if (!page.hasMore) return null;
  if ("cursor" in input) return { ...input, cursor: page.cursor };

  return page.nextPageCursor === null
    ? null
    : { ...input, page_cursor: page.nextPageCursor };
};

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
        gameEnvironment: entry.game_environment,
        gameBuild: entry.game_build,
      }));

    default:
      throw new Error(
        `Unknown capability: ${payload.capability_id satisfies never}`,
      );
  }
};

/**
 * The relay part of the consumer client of `log_entries` (see
 * `useLogEntriesFeed()`): the watch lease, the list of the sharing owners,
 * the snapshot with its cursor, the realtime events of the own channel, and
 * the reads of the changes since the cursor. `useSyncExternalStore()` reads
 * its state.
 *
 * The order: first the watch lease, then the snapshot, thus no entry falls
 * between the snapshot and the first delivery. The consumer reads the list
 * of the sharing owners at short intervals, and a new snapshot when the
 * list changes. It reads the changes since the cursor when the lease was not
 * continuous, after each subscription of the channel (also after a
 * reconnect of the realtime service), after dropped entries of the relay,
 * and at each renewal while the realtime delivery does not work.
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
      isCatchingUp: true,
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
      this.#setState({ isCatchingUp: true });
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
      sharingOwnersTimeout: undefined,
      isSharingOwnersReadRunning: false,
      cursor: null,
      historyTimeout: undefined,
      historyReadUntil: null,
      sharingOwnersSignature: null,
      snapshotOwnerCitizenIds: new Set(),
      isSnapshotRequested: false,
      isChangesReadRequested: false,
      isHistoryReadRequested: false,
      isSyncRunning: false,
      readAbortController: null,
    };
    this.#session = session;
    this.#problems.clear();
    this.#setState({ ...this.#initialState, scope: this.#state.scope });

    window.addEventListener("pagehide", this.#handlePageHide);
    window.addEventListener("pageshow", this.#handlePageShow);

    void this.#renew(session);
    void this.#readSharingOwners(session);
  }

  /** Ends the session and its watch lease */
  stop() {
    const session = this.#session;
    if (!session) return;

    this.#session = null;
    session.abortController.abort();
    window.clearTimeout(session.renewalTimeout);
    window.clearTimeout(session.sharingOwnersTimeout);
    window.clearTimeout(session.historyTimeout);
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

    if (isAccessProblem(problem) && this.#session)
      this.#forgetOtherOwners(this.#session);
  }

  /**
   * The app refused the lease or the list of the owners, thus it refuses the
   * reads too. A refused read does not count: the next renewal tries it
   * again.
   */
  #isAccessRefused() {
    return [ProblemSource.Lease, ProblemSource.SharingOwners].some((source) =>
      isAccessProblem(this.#problems.get(source)),
    );
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

  /** Renews the watch lease, starts the requested reads, then plans the next renewal */
  async #renew(session: Session) {
    if (session.isRenewalRunning) {
      session.isRenewalRequested = true;
      return;
    }

    session.isRenewalRunning = true;
    window.clearTimeout(session.renewalTimeout);

    try {
      const { lease } =
        await this.#client.remoteControlProgram.renewWatchLease.mutate(
          {
            consumer_id: session.consumerId,
            capability_id: CapabilityId.LogEntries,
            owner_citizen_ids: [...(this.#state.scope.ownerCitizenIds ?? [])],
          },
          { signal: this.#createSignal(session, RENEWAL_TIMEOUT_MILLISECONDS) },
        );
      if (!this.#isCurrent(session)) return;

      if (lease === null) {
        session.isRenewalRunning = false;
        window.clearTimeout(session.sharingOwnersTimeout);
        this.#setProblem(ProblemSource.Lease, null);
        this.#setState({
          relayAvailability: RelayFeedAvailability.NotConfigured,
          isLoading: false,
          sharingOwners: [],
          hasMoreSharingOwners: false,
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
    } catch (error) {
      if (!this.#isCurrent(session)) return;

      const problem = toProblem(error);
      session.isLeaseValid = false;
      this.#setProblem(ProblemSource.Lease, problem);
      // The use case refused the lease, thus the app has a relay service
      if (problem !== LogEntriesFeedProblem.RequestFailed)
        this.#setState({ relayAvailability: RelayFeedAvailability.Available });
    }

    session.isRenewalRunning = false;

    if (this.#isAccessRefused()) {
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

  /** Reads the list of the sharing owners, then plans the next read */
  async #readSharingOwners(session: Session) {
    if (session.isSharingOwnersReadRunning) return;

    session.isSharingOwnersReadRunning = true;
    window.clearTimeout(session.sharingOwnersTimeout);

    try {
      const sharingOwners =
        await this.#client.remoteControlProgram.listSharingOwners.query(
          { capability_id: CapabilityId.LogEntries },
          { signal: this.#createSignal(session, RENEWAL_TIMEOUT_MILLISECONDS) },
        );
      if (!this.#isCurrent(session)) return;

      this.#setProblem(ProblemSource.SharingOwners, null);
      this.#applySharingOwners(session, sharingOwners);
    } catch (error) {
      if (!this.#isCurrent(session)) return;

      this.#setProblem(ProblemSource.SharingOwners, toProblem(error));
    }

    session.isSharingOwnersReadRunning = false;

    // Without a relay service, the consumer shows only the own entries of the browser runtime
    if (this.#state.relayAvailability === RelayFeedAvailability.NotConfigured)
      return;

    session.sharingOwnersTimeout = window.setTimeout(() => {
      void this.#readSharingOwners(session);
    }, SHARING_OWNERS_READ_INTERVAL_MILLISECONDS);
  }

  #applySharingOwners(
    session: Session,
    { owners, hasMoreOwners }: SharingOwners,
  ) {
    if (this.#state.relayAvailability === RelayFeedAvailability.NotConfigured)
      return;

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

  /**
   * Without access, the consumer keeps only the own entries of the relay
   * (principle 5). A list of owners after the access comes back gives a new
   * snapshot.
   */
  #forgetOtherOwners(session: Session) {
    session.sharingOwnersSignature = createSharingOwnersSignature([]);
    session.snapshotOwnerCitizenIds = new Set();

    const relayEntries = retainRelayEntries(
      this.#state.relayEntries,
      (entry) => entry.owner.id === session.ownCitizenId,
    );
    if (
      relayEntries !== this.#state.relayEntries ||
      this.#state.sharingOwners.length > 0 ||
      this.#state.hasMoreSharingOwners
    )
      this.#setState({
        sharingOwners: [],
        hasMoreSharingOwners: false,
        relayEntries,
      });
  }

  #retainVisibleRelayEntries(session: Session) {
    const { scope, relayEntries, sharingOwners, hasMoreSharingOwners } =
      this.#state;
    const filter = createRelayEntryFilter({
      scope,
      ownCitizenId: session.ownCitizenId,
      sharingOwners:
        session.sharingOwnersSignature === null ? null : sharingOwners,
      confirmedOwnerCitizenIds: hasMoreSharingOwners
        ? session.snapshotOwnerCitizenIds
        : undefined,
      historyEnd: getLogAnalyzerHistoryEnd(new Date()),
    });

    this.#setState({ relayEntries: retainRelayEntries(relayEntries, filter) });
  }

  #addRelayEntries(session: Session, entries: readonly RelayLogEntry[]) {
    const filter = createRelayEntryFilter({
      scope: this.#state.scope,
      ownCitizenId: session.ownCitizenId,
      // A new grant can deliver entries before the next list of the owners
      sharingOwners: null,
      historyEnd: getLogAnalyzerHistoryEnd(new Date()),
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
    if (!session || !event.persisted) return;

    void this.#renew(session);
    void this.#readSharingOwners(session);
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
    this.#setState({ isLoading: true, isCatchingUp: true });
    void this.#sync(session);
  }

  #requestChanges(session: Session) {
    session.isChangesReadRequested = true;
    this.#setState({ isCatchingUp: true });
    void this.#sync(session);
  }

  /**
   * Runs the requested reads one after the other. A snapshot comes first, and
   * it covers the changes and the history that were requested before it. A
   * failed read waits for the next renewal.
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
        session.isHistoryReadRequested = false;
        outcome = await this.#readSnapshot(session);
        if (outcome === ReadOutcome.Failed) session.isSnapshotRequested = true;
      } else if (session.isChangesReadRequested && session.cursor !== null) {
        session.isChangesReadRequested = false;
        outcome = await this.#readChanges(session, session.cursor);
        if (outcome === ReadOutcome.Failed)
          session.isChangesReadRequested = true;
      } else if (session.isHistoryReadRequested && session.cursor !== null) {
        session.isHistoryReadRequested = false;
        outcome = await this.#readHistory(session);
        if (outcome === ReadOutcome.Failed)
          session.isHistoryReadRequested = true;
      } else {
        break;
      }

      if (
        outcome !== ReadOutcome.Failed &&
        outcome !== ReadOutcome.Ended &&
        !session.isSnapshotRequested &&
        !session.isChangesReadRequested
      )
        this.#setState({ isCatchingUp: !this.#isRealtimeSubscribed });
    }

    session.isSyncRunning = false;
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

  /** The time window of the reads. Without a limit, the input has no time. */
  #getEntryWindowInput() {
    const { start, end } = this.#state.scope.entryWindow;
    return { start: start ?? undefined, end: end ?? undefined };
  }

  /**
   * Reads the pages of a snapshot, of the changes or of the history and adds
   * their entries. A snapshot keeps the cursor of its first page, which covers
   * all its pages. Each page of the changes moves the cursor. The history
   * covers no changes, thus it does not move the cursor.
   */
  async #readPages(
    session: Session,
    firstInput: FeedEntriesInput,
    {
      movesCursor = true,
      onPage,
    }: {
      readonly movesCursor?: boolean;
      readonly onPage?: (page: FeedEntriesPage) => void;
    } = {},
  ): Promise<ReadOutcome> {
    const readAbortController = new AbortController();
    session.readAbortController = readAbortController;
    const signal = AbortSignal.any([
      readAbortController.signal,
      this.#createSignal(session, READ_TIMEOUT_MILLISECONDS),
    ]);
    let input = firstInput;

    for (
      let pageIndex = 0;
      pageIndex < MAXIMUM_PAGES_PER_READ;
      pageIndex += 1
    ) {
      let page: FeedEntriesPage;
      try {
        page = await this.#client.remoteControlProgram.readFeedEntries.query(
          input,
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

      if (movesCursor && (pageIndex === 0 || "cursor" in input))
        session.cursor = page.cursor;
      this.#addRelayEntries(session, page.entries);
      onPage?.(page);

      const nextInput = getNextPageInput(input, page);
      if (nextInput === null) return ReadOutcome.Completed;
      input = nextInput;
    }

    return ReadOutcome.Truncated;
  }

  async #readSnapshot(session: Session): Promise<ReadOutcome> {
    this.#retainVisibleRelayEntries(session);
    this.#setState({
      isLoading: true,
      relayEntries: {
        entries: this.#state.relayEntries.entries,
        incompleteUntil: null,
      },
    });

    const historyEnd = getLogAnalyzerHistoryEnd(new Date());
    const progress: SnapshotProgress = {
      oldestEventAt: null,
      ownerCitizenIds: new Set(),
    };
    const outcome = await this.#readPages(
      session,
      this.#getEntryWindowInput(),
      {
        onPage: (page) => {
          progress.oldestEventAt =
            page.entries.at(-1)?.eventAt ?? progress.oldestEventAt;
          for (const entry of page.entries)
            if (entry.eventAt >= historyEnd)
              progress.ownerCitizenIds.add(entry.owner.id);
        },
      },
    );
    if (outcome !== ReadOutcome.Completed && outcome !== ReadOutcome.Truncated)
      return outcome;

    session.historyReadUntil = historyEnd;
    this.#planHistoryRead(session);

    if (outcome === ReadOutcome.Truncated && progress.oldestEventAt !== null)
      this.#setState({
        relayEntries: markRelayEntriesIncomplete(
          this.#state.relayEntries,
          progress.oldestEventAt,
        ),
      });

    // Removes the entries of the owners outside of the list that the snapshot did not confirm
    session.snapshotOwnerCitizenIds = progress.ownerCitizenIds;
    if (this.#state.hasMoreSharingOwners)
      this.#retainVisibleRelayEntries(session);

    this.#completeRead();
    return ReadOutcome.Completed;
  }

  async #readChanges(session: Session, cursor: string): Promise<ReadOutcome> {
    const outcome = await this.#readPages(session, {
      ...this.#getEntryWindowInput(),
      cursor,
    });

    switch (outcome) {
      case ReadOutcome.Completed:
        this.#completeRead();
        return outcome;

      case ReadOutcome.Truncated:
        this.#requestSnapshot(session);
        return ReadOutcome.Completed;

      case ReadOutcome.Superseded:
      case ReadOutcome.Failed:
      case ReadOutcome.Ended:
        return outcome;

      default:
        throw new Error(`Unknown read outcome: ${outcome satisfies never}`);
    }
  }

  #planHistoryRead(session: Session) {
    window.clearTimeout(session.historyTimeout);
    session.historyTimeout = window.setTimeout(() => {
      session.isHistoryReadRequested = true;
      void this.#sync(session);
    }, HISTORY_READ_INTERVAL_MILLISECONDS);
  }

  /** Reads the entries that became history since the last read */
  async #readHistory(session: Session): Promise<ReadOutcome> {
    const { entryWindow } = this.#state.scope;
    const historyEnd = getLogAnalyzerHistoryEnd(new Date());
    const start = Math.max(
      (session.historyReadUntil ?? historyEnd).getTime() -
        HISTORY_READ_OVERLAP_MILLISECONDS,
      entryWindow.start?.getTime() ?? Number.NEGATIVE_INFINITY,
    );
    const end = Math.min(
      historyEnd.getTime() + HISTORY_READ_OVERLAP_MILLISECONDS,
      entryWindow.end?.getTime() ?? Number.POSITIVE_INFINITY,
    );

    if (start < end) {
      const outcome = await this.#readPages(
        session,
        { start: new Date(start), end: new Date(end) },
        { movesCursor: false },
      );
      if (
        outcome !== ReadOutcome.Completed &&
        outcome !== ReadOutcome.Truncated
      )
        return outcome;

      this.#completeRead();
    }

    session.historyReadUntil = historyEnd;
    this.#planHistoryRead(session);
    return ReadOutcome.Completed;
  }

  #completeRead() {
    this.#setProblem(ProblemSource.Reads, null);
    if (this.#state.isLoading && !this.#session?.isSnapshotRequested)
      this.#setState({ isLoading: false });
  }
}
