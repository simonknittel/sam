import type { IconType } from "react-icons";
import {
  FaArrowRightToBracket,
  FaBan,
  FaFileSignature,
  FaGavel,
  FaHouseLock,
  FaPeace,
  FaSatelliteDish,
} from "react-icons/fa6";
import {
  LiveStatusKind,
  LiveStatusSignalType,
  type LiveStatusSignal,
} from "./liveStatusSignals";
import type { IEntry } from "./PATTERNS";

/**
 * The Live-Status derives the current states of each reporter from pairs of
 * entries, for example "entered" and "left". A crash or a type which a
 * reporter does not share can remove the end of a pair. Thus a state closes
 * in layers: with its end line, at the end of its session, when the own log
 * stops, or after a timeout. A state first shows as uncertain, then it
 * disappears.
 *
 * The durations come from 73 real log files of one player.
 */

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

interface Timeout {
  /** The time without a new line, after which the state is uncertain */
  readonly fadeAfterMs: number;
  /** The time without a new line, after which the state disappears */
  readonly hideAfterMs: number;
}

interface KindDefinition {
  readonly title: string;
  readonly icon: IconType;
  /**
   * The end of the session closes the state, and the state is never more
   * certain than its session.
   */
  readonly isSessionBound: boolean;
  /** A reporter can have more than one state of the kind at the same time */
  readonly isMultiple: boolean;
  /** Null when the state lasts as long as its session */
  readonly timeout: Timeout | null;
}

/** A zone has an end line, thus the timeout only catches a lost one */
const ZONE_TIMEOUT: Timeout = {
  fadeAfterMs: 2 * MILLISECONDS_PER_HOUR,
  hideAfterMs: 4 * MILLISECONDS_PER_HOUR,
};

export const LIVE_STATUS_KINDS: Record<LiveStatusKind, KindDefinition> = {
  [LiveStatusKind.Jurisdiction]: {
    title: "Jurisdiktion",
    icon: FaGavel,
    isSessionBound: true,
    isMultiple: false,
    /** The game writes no line when the player leaves a jurisdiction */
    timeout: null,
  },
  [LiveStatusKind.ArmisticeZone]: {
    title: "Armistice Zone",
    icon: FaPeace,
    isSessionBound: true,
    isMultiple: false,
    timeout: ZONE_TIMEOUT,
  },
  [LiveStatusKind.MonitoredSpace]: {
    title: "Monitored Space",
    icon: FaSatelliteDish,
    isSessionBound: true,
    isMultiple: false,
    timeout: ZONE_TIMEOUT,
  },
  [LiveStatusKind.PrivateProperty]: {
    title: "Private Property",
    icon: FaHouseLock,
    isSessionBound: true,
    isMultiple: false,
    timeout: ZONE_TIMEOUT,
  },
  [LiveStatusKind.RestrictedArea]: {
    title: "Sperrgebiet",
    icon: FaBan,
    isSessionBound: true,
    isMultiple: false,
    timeout: ZONE_TIMEOUT,
  },
  [LiveStatusKind.Instance]: {
    title: "Instanz",
    icon: FaArrowRightToBracket,
    isSessionBound: true,
    /** Two instances can overlap for a short time */
    isMultiple: true,
    /**
     * The game writes the exit line rarely (8 exits for 44 entries), but it
     * repeats the entry line while the player stays in the instance.
     */
    timeout: {
      fadeAfterMs: 15 * MILLISECONDS_PER_MINUTE,
      hideAfterMs: MILLISECONDS_PER_HOUR,
    },
  },
  [LiveStatusKind.Contract]: {
    title: "Contract",
    icon: FaFileSignature,
    /** A contract continues after a relog */
    isSessionBound: false,
    isMultiple: true,
    /**
     * 99 % of the contracts end within 1.4 hours, the longest one took 2.8
     * hours. 8.5 % of the contracts have no end line.
     */
    timeout: {
      fadeAfterMs: 1.5 * MILLISECONDS_PER_HOUR,
      hideAfterMs: 6 * MILLISECONDS_PER_HOUR,
    },
  },
};

/**
 * Measured from the last entry of the reporter, of any type. Another citizen
 * does not share all types, thus a quiet session is not an ended session.
 */
const SESSION_TIMEOUT: Timeout = {
  fadeAfterMs: MILLISECONDS_PER_HOUR,
  hideAfterMs: 4 * MILLISECONDS_PER_HOUR,
};

/**
 * Measured from the last party line. A party continues after a relog, thus
 * its session does not close it.
 */
const PARTY_TIMEOUT: Timeout = {
  fadeAfterMs: 6 * MILLISECONDS_PER_HOUR,
  hideAfterMs: 24 * MILLISECONDS_PER_HOUR,
};

/**
 * While the game runs, it writes a line at least every 5.5 minutes (the
 * longest gap in the real logs). After a longer silence of the own log, the
 * game does not run.
 */
const OWN_LOG_SILENCE_THRESHOLD_MS = 10 * MILLISECONDS_PER_MINUTE;

/** The own entries of a user without a linked citizen */
const OWN_REPORTER_KEY = "own";

interface TrackedState {
  readonly kind: LiveStatusKind;
  readonly key: string | null;
  readonly label: string | null;
  readonly since: Date;
  /** The last line which started or repeated the state */
  readonly lastSeenAt: Date;
}

interface TrackedParty {
  readonly since: Date;
  readonly lastSeenAt: Date;
  /** The game names only the members who join after the reporter */
  readonly members: Set<string>;
  readonly leader: string | null;
}

/** The states of a reporter after the last entry, before any timeout. */
export interface TrackedReporter {
  readonly key: string;
  readonly citizen: IEntry["citizen"];
  /** True when the local parser read entries of this reporter */
  isOwn: boolean;
  lastActivityAt: Date;
  /**
   * True when the reporter shares the joins of a server. Then only a join
   * starts a session after the end of the last one.
   */
  hasSessionStart: boolean;
  shard: string | null;
  shardSince: Date | null;
  /** Null after a join, thus not null only while no session runs */
  sessionEndedAt: Date | null;
  states: TrackedState[];
  party: TrackedParty | null;
}

/**
 * The order of the signals of one instant: the end of a session comes before
 * the start of the next one, an end of a state before a start, and the start
 * of a party before the lines about its members.
 */
const SIGNAL_ORDER: Record<LiveStatusSignalType, number> = {
  [LiveStatusSignalType.SessionEnd]: 0,
  [LiveStatusSignalType.SessionStart]: 1,
  [LiveStatusSignalType.StateEnd]: 2,
  [LiveStatusSignalType.PartyEnd]: 2,
  [LiveStatusSignalType.PartyMemberLeave]: 2,
  [LiveStatusSignalType.PartyStart]: 3,
  [LiveStatusSignalType.StateStart]: 4,
  [LiveStatusSignalType.PartyMemberJoin]: 4,
  [LiveStatusSignalType.PartyLeaderChange]: 4,
};

const getSignalOrder = (entry: IEntry) =>
  entry.liveStatusSignal ? SIGNAL_ORDER[entry.liveStatusSignal.type] : 0;

/** The key makes the order of the same instant the same on each run */
const compareEntries = (first: IEntry, second: IEntry) =>
  first.isoDate.getTime() - second.isoDate.getTime() ||
  getSignalOrder(first) - getSignalOrder(second) ||
  first.key.localeCompare(second.key);

/** A shared entry of a deleted citizen belongs to nobody */
const getReporterKey = (entry: IEntry) => {
  if (entry.citizen) return entry.citizen.id;
  return entry.isShared ? null : OWN_REPORTER_KEY;
};

const closeSessionBoundStates = (reporter: TrackedReporter) => {
  reporter.states = reporter.states.filter(
    ({ kind }) => !LIVE_STATUS_KINDS[kind].isSessionBound,
  );
};

type StateSignal = Extract<LiveStatusSignal, { readonly kind: LiveStatusKind }>;

const startState = (
  reporter: TrackedReporter,
  { kind, key, label }: StateSignal,
  at: Date,
) => {
  const index = reporter.states.findIndex((state) => {
    if (state.kind !== kind) return false;
    if (!LIVE_STATUS_KINDS[kind].isMultiple) return true;
    if (key !== null) return state.key === key;
    return state.key === null && state.label === label;
  });
  const existingState = index >= 0 ? reporter.states[index] : null;

  /** A new jurisdiction replaces the old one */
  const isRepeat = existingState?.label === label;
  const state: TrackedState = {
    kind,
    key,
    label,
    since: existingState && isRepeat ? existingState.since : at,
    lastSeenAt: at,
  };

  if (existingState) {
    reporter.states[index] = state;
  } else {
    reporter.states.push(state);
  }
};

/**
 * The end of a contract names its mission. A line without a mission id names
 * only the contract, thus it ends the oldest open contract of that name.
 */
const findStateToEnd = (
  states: readonly TrackedState[],
  { kind, key, label }: StateSignal,
) => {
  if (!LIVE_STATUS_KINDS[kind].isMultiple)
    return states.findIndex((state) => state.kind === kind);

  if (key !== null) {
    const index = states.findIndex(
      (state) => state.kind === kind && state.key === key,
    );
    if (index >= 0) return index;
  }

  if (label === null) return -1;
  return states.findIndex(
    (state) =>
      state.kind === kind &&
      state.label === label &&
      /** A known mission id must not end a contract of another mission */
      (key === null || state.key === null),
  );
};

const continueParty = (reporter: TrackedReporter, at: Date) => {
  const party: TrackedParty = reporter.party
    ? { ...reporter.party, lastSeenAt: at }
    : { since: at, lastSeenAt: at, members: new Set(), leader: null };
  reporter.party = party;
  return party;
};

const applySignal = (
  reporter: TrackedReporter,
  signal: LiveStatusSignal,
  at: Date,
) => {
  switch (signal.type) {
    case LiveStatusSignalType.SessionStart:
      /** A join of a server is a new session for the zones and instances */
      closeSessionBoundStates(reporter);
      reporter.hasSessionStart = true;
      reporter.shard = signal.shard;
      reporter.shardSince = at;
      reporter.sessionEndedAt = null;
      break;

    case LiveStatusSignalType.SessionEnd:
      closeSessionBoundStates(reporter);
      reporter.shard = null;
      reporter.shardSince = null;
      reporter.sessionEndedAt = at;
      break;

    case LiveStatusSignalType.StateStart:
      startState(reporter, signal, at);
      break;

    case LiveStatusSignalType.StateEnd: {
      const index = findStateToEnd(reporter.states, signal);
      if (index >= 0) reporter.states.splice(index, 1);
      break;
    }

    case LiveStatusSignalType.PartyStart:
      reporter.party = {
        since: at,
        lastSeenAt: at,
        members: new Set(),
        leader: null,
      };
      break;

    case LiveStatusSignalType.PartyEnd:
      reporter.party = null;
      break;

    /** A line about a member also tells that the reporter is in a party */
    case LiveStatusSignalType.PartyMemberJoin:
      continueParty(reporter, at).members.add(signal.handle);
      break;

    case LiveStatusSignalType.PartyMemberLeave:
      continueParty(reporter, at).members.delete(signal.handle);
      break;

    case LiveStatusSignalType.PartyLeaderChange:
      reporter.party = {
        ...continueParty(reporter, at),
        leader: signal.handle,
      };
      break;

    default:
      throw new Error(`Unknown Live-Status signal: ${signal satisfies never}`);
  }
};

/**
 * The states of each reporter after their last entry. This step depends only
 * on the entries, thus a tick of the clock does not repeat it (see
 * `evaluateLiveStatus`).
 *
 * It uses all entries in memory, of all types: the filters of the table must
 * not remove the end of a pair.
 */
export const trackLiveStatus = (entries: Iterable<IEntry>) => {
  const reporters = new Map<string, TrackedReporter>();

  for (const entry of Array.from(entries).toSorted(compareEntries)) {
    const key = getReporterKey(entry);
    if (key === null) continue;

    let reporter = reporters.get(key);
    if (!reporter) {
      reporter = {
        key,
        citizen: entry.citizen,
        isOwn: false,
        hasSessionStart: false,
        lastActivityAt: entry.isoDate,
        shard: null,
        shardSince: null,
        sessionEndedAt: null,
        states: [],
        party: null,
      };
      reporters.set(key, reporter);
    }

    reporter.lastActivityAt = entry.isoDate;
    if (!entry.isShared) reporter.isOwn = true;
    if (entry.liveStatusSignal)
      applySignal(reporter, entry.liveStatusSignal, entry.isoDate);
  }

  return Array.from(reporters.values());
};

export enum LiveStatusPresence {
  Online = "online",
  Uncertain = "uncertain",
  Offline = "offline",
}

export interface LiveStatusState {
  readonly kind: LiveStatusKind;
  readonly key: string | null;
  readonly label: string | null;
  readonly since: Date;
  readonly isUncertain: boolean;
}

export interface LiveStatusParty {
  readonly since: Date;
  readonly isUncertain: boolean;
  readonly members: readonly string[];
  readonly leader: string | null;
}

export interface LiveStatusReporter {
  readonly key: string;
  readonly citizen: IEntry["citizen"];
  readonly isOwn: boolean;
  readonly presence: LiveStatusPresence;
  /** The end of the session while offline. Null when it is not known. */
  readonly offlineSince: Date | null;
  readonly shard: string | null;
  readonly shardSince: Date | null;
  readonly lastActivityAt: Date;
  readonly states: readonly LiveStatusState[];
  readonly party: LiveStatusParty | null;
}

export interface LiveStatusOptions {
  readonly now: Date;
  /** The newest line which the local parser read. Null before a read. */
  readonly ownLogLineAt: Date | null;
  readonly isLiveModeActive: boolean;
}

enum TimeoutStage {
  Fresh = "fresh",
  Faded = "faded",
  Expired = "expired",
}

const getTimeoutStage = (timeout: Timeout, lastSeenAt: Date, now: Date) => {
  const age = now.getTime() - lastSeenAt.getTime();
  if (age >= timeout.hideAfterMs) return TimeoutStage.Expired;
  if (age >= timeout.fadeAfterMs) return TimeoutStage.Faded;
  return TimeoutStage.Fresh;
};

const PRESENCE_BY_STAGE: Record<TimeoutStage, LiveStatusPresence> = {
  [TimeoutStage.Fresh]: LiveStatusPresence.Online,
  [TimeoutStage.Faded]: LiveStatusPresence.Uncertain,
  [TimeoutStage.Expired]: LiveStatusPresence.Offline,
};

const evaluateSession = (
  reporter: TrackedReporter,
  { now, ownLogLineAt, isLiveModeActive }: LiveStatusOptions,
) => {
  const { sessionEndedAt, lastActivityAt } = reporter;

  /**
   * After the end of a session, for example in the menu, only the next join
   * of a server starts a session. For a reporter who shares no joins, any
   * later entry tells that the reporter plays again.
   */
  if (
    sessionEndedAt &&
    (reporter.hasSessionStart || sessionEndedAt >= lastActivityAt)
  )
    return {
      presence: LiveStatusPresence.Offline,
      offlineSince: sessionEndedAt,
    };

  /** A running game does not bring back a session which ended long ago */
  const stage = getTimeoutStage(SESSION_TIMEOUT, lastActivityAt, now);
  if (stage === TimeoutStage.Expired)
    return {
      presence: LiveStatusPresence.Offline,
      offlineSince: lastActivityAt,
    };

  /**
   * The own log tells only about this computer, not about the entries which
   * the citizen shares from another one.
   */
  if (reporter.isOwn && ownLogLineAt && ownLogLineAt >= lastActivityAt) {
    const silence = now.getTime() - ownLogLineAt.getTime();
    if (silence < OWN_LOG_SILENCE_THRESHOLD_MS)
      return { presence: LiveStatusPresence.Online, offlineSince: null };

    if (isLiveModeActive)
      return {
        presence: LiveStatusPresence.Offline,
        offlineSince: ownLogLineAt,
      };

    /** Without live mode, the game can have written lines since the read */
    return { presence: LiveStatusPresence.Uncertain, offlineSince: null };
  }

  return { presence: PRESENCE_BY_STAGE[stage], offlineSince: null };
};

const KIND_ORDER = Object.values(LiveStatusKind);

const compareStates = (first: LiveStatusState, second: LiveStatusState) =>
  KIND_ORDER.indexOf(first.kind) - KIND_ORDER.indexOf(second.kind) ||
  first.since.getTime() - second.since.getTime();

const evaluateStates = (
  states: readonly TrackedState[],
  sessionPresence: LiveStatusPresence,
  now: Date,
) =>
  states
    .flatMap((state): LiveStatusState[] => {
      const { isSessionBound, timeout } = LIVE_STATUS_KINDS[state.kind];
      if (isSessionBound && sessionPresence === LiveStatusPresence.Offline)
        return [];

      const stage = timeout
        ? getTimeoutStage(timeout, state.lastSeenAt, now)
        : TimeoutStage.Fresh;
      if (stage === TimeoutStage.Expired) return [];

      return [
        {
          kind: state.kind,
          key: state.key,
          label: state.label,
          since: state.since,
          isUncertain:
            stage === TimeoutStage.Faded ||
            (isSessionBound &&
              sessionPresence === LiveStatusPresence.Uncertain),
        },
      ];
    })
    .toSorted(compareStates);

const evaluateParty = (party: TrackedParty | null, now: Date) => {
  if (!party) return null;

  const stage = getTimeoutStage(PARTY_TIMEOUT, party.lastSeenAt, now);
  if (stage === TimeoutStage.Expired) return null;

  return {
    since: party.since,
    isUncertain: stage === TimeoutStage.Faded,
    members: Array.from(party.members),
    leader: party.leader,
  };
};

const PRESENCE_ORDER = Object.values(LiveStatusPresence);

const compareReporters = (
  first: LiveStatusReporter,
  second: LiveStatusReporter,
) =>
  PRESENCE_ORDER.indexOf(first.presence) -
    PRESENCE_ORDER.indexOf(second.presence) ||
  second.lastActivityAt.getTime() - first.lastActivityAt.getTime();

/**
 * The Live-Status at the given time: the reporters who are online, and the
 * offline reporters with a state which continues after a session (a contract
 * or a party). Online reporters come first, then the uncertain ones, then the
 * offline ones; the most recent activity first in each group.
 */
export const evaluateLiveStatus = (
  reporters: readonly TrackedReporter[],
  options: LiveStatusOptions,
): LiveStatusReporter[] =>
  reporters
    .flatMap((reporter): LiveStatusReporter[] => {
      const { presence, offlineSince } = evaluateSession(reporter, options);
      const states = evaluateStates(reporter.states, presence, options.now);
      const party = evaluateParty(reporter.party, options.now);
      const isOffline = presence === LiveStatusPresence.Offline;

      if (isOffline && states.length <= 0 && !party) return [];

      return [
        {
          key: reporter.key,
          citizen: reporter.citizen,
          isOwn: reporter.isOwn,
          presence,
          offlineSince,
          shard: isOffline ? null : reporter.shard,
          shardSince: isOffline ? null : reporter.shardSince,
          lastActivityAt: reporter.lastActivityAt,
          states,
          party,
        },
      ];
    })
    .toSorted(compareReporters);
