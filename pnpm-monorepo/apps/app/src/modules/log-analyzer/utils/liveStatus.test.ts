import {
  LogAnalyzerEntryType,
  matchLogAnalyzerEntryLine,
} from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import {
  evaluateLiveStatus,
  LiveStatusPresence,
  trackLiveStatus,
  type LiveStatusOptions,
} from "./liveStatus";
import {
  LiveStatusKind,
  LiveStatusSignalType,
  PARTY_END_SIGNAL,
  PARTY_START_SIGNAL,
  SESSION_END_SIGNAL,
  type LiveStatusSignal,
} from "./liveStatusSignals";
import { deriveEntryFields, type IEntry } from "./PATTERNS";
import { SAMPLE_LINES } from "./sampleLines";

const MILLISECONDS_PER_MINUTE = 60_000;
const START = new Date("2026-11-14T12:00:00.000Z");

const at = (minute: number) =>
  new Date(START.getTime() + minute * MILLISECONDS_PER_MINUTE);

interface EntryOptions {
  readonly citizenId?: string;
  readonly isShared?: boolean;
}

/** An entry with the given signal, at the given minute after `START` */
const entry = (
  minute: number,
  liveStatusSignal: LiveStatusSignal | null,
  { citizenId = "alice", isShared = false }: EntryOptions = {},
): IEntry => ({
  key: `${minute}_${citizenId}_${JSON.stringify(liveStatusSignal)}`,
  type: LogAnalyzerEntryType.JoinPu,
  isoDate: at(minute),
  message: null,
  collapseKey: null,
  missionId: null,
  contractName: null,
  citizen: { id: citizenId, handle: citizenId, deletedAt: null },
  isShared,
  isUploaded: false,
  liveStatusSignal,
});

const sessionStart = (shard = "pub_euw1b_9873572_100"): LiveStatusSignal => ({
  type: LiveStatusSignalType.SessionStart,
  shard,
});

const stateStart = (
  kind: LiveStatusKind,
  key: string | null = null,
  label: string | null = null,
): LiveStatusSignal => ({
  type: LiveStatusSignalType.StateStart,
  kind,
  key,
  label,
});

const stateEnd = (
  kind: LiveStatusKind,
  key: string | null = null,
  label: string | null = null,
): LiveStatusSignal => ({
  type: LiveStatusSignalType.StateEnd,
  kind,
  key,
  label,
});

const evaluate = (
  entries: IEntry[],
  minute: number,
  options: Partial<LiveStatusOptions> = {},
) =>
  evaluateLiveStatus(trackLiveStatus(entries), {
    now: at(minute),
    ownLogLineAt: null,
    isLiveModeActive: false,
    ...options,
  });

/** The kinds and labels of the states of the first reporter */
const statesOf = (reporters: ReturnType<typeof evaluate>) =>
  reporters[0]?.states.map(({ kind, label, isUncertain }) => ({
    kind,
    label,
    isUncertain,
  }));

describe("Live-Status", () => {
  test("the end of a session closes its zones, but not its contracts and party", () => {
    const entries = [
      entry(0, sessionStart()),
      entry(1, stateStart(LiveStatusKind.ArmisticeZone)),
      entry(2, stateStart(LiveStatusKind.Contract, "mission", "Delivery")),
      entry(3, PARTY_START_SIGNAL),
      entry(4, SESSION_END_SIGNAL),
    ];

    const [reporter] = evaluate(entries, 5);

    expect(reporter.presence).toBe(LiveStatusPresence.Offline);
    expect(reporter.offlineSince).toEqual(at(4));
    expect(reporter.shard).toBeNull();
    expect(statesOf([reporter])).toEqual([
      { kind: LiveStatusKind.Contract, label: "Delivery", isUncertain: false },
    ]);
    expect(reporter.party).not.toBeNull();
  });

  test("a new server closes the zones of the old server", () => {
    const entries = [
      entry(0, sessionStart("pub_euw1b_1_100")),
      entry(1, stateStart(LiveStatusKind.MonitoredSpace)),
      entry(2, sessionStart("pub_euw1b_2_100")),
    ];

    const [reporter] = evaluate(entries, 3);

    expect(reporter.presence).toBe(LiveStatusPresence.Online);
    expect(reporter.shard).toBe("pub_euw1b_2_100");
    expect(reporter.shardSince).toEqual(at(2));
    expect(reporter.states).toEqual([]);
  });

  test("the end and the start of a session at the same time give a new session", () => {
    const entries = [entry(1, sessionStart()), entry(1, SESSION_END_SIGNAL)];

    expect(evaluate(entries, 2)[0].presence).toBe(LiveStatusPresence.Online);
  });

  test("a contract ends by its mission id, else by its name", () => {
    const entries = [
      entry(0, stateStart(LiveStatusKind.Contract, "first", "Delivery")),
      entry(1, stateStart(LiveStatusKind.Contract, "second", "Delivery")),
      entry(2, stateStart(LiveStatusKind.Contract, "third", "Bounty")),
      entry(3, stateEnd(LiveStatusKind.Contract, "second", "Delivery")),
      /** Another mission of the same name was never accepted in the logs */
      entry(4, stateEnd(LiveStatusKind.Contract, "unknown", "Bounty")),
      entry(5, stateEnd(LiveStatusKind.Contract, null, "Delivery")),
    ];

    expect(evaluate(entries, 6)[0].states.map(({ key }) => key)).toEqual([
      "third",
    ]);
  });

  test("instances overlap, and a repeat of the entry line restarts the timeout", () => {
    const entries = [
      entry(0, sessionStart()),
      entry(1, stateStart(LiveStatusKind.Instance, "hangar", "Hangar")),
      entry(2, stateStart(LiveStatusKind.Instance, "bunker", "Bunker")),
      entry(3, stateEnd(LiveStatusKind.Instance, "hangar")),
      entry(10, stateStart(LiveStatusKind.Instance, "bunker", "Bunker")),
    ];

    expect(evaluate(entries, 24)[0].states).toMatchObject([
      { label: "Bunker", since: at(2), isUncertain: false },
    ]);
    expect(evaluate(entries, 25)[0].states).toMatchObject([
      { label: "Bunker", isUncertain: true },
    ]);
  });

  test("a state fades, then it disappears", () => {
    const entries = [
      entry(0, stateStart(LiveStatusKind.Contract, "mission", "Delivery")),
    ];

    expect(statesOf(evaluate(entries, 89))).toEqual([
      { kind: LiveStatusKind.Contract, label: "Delivery", isUncertain: false },
    ]);
    expect(statesOf(evaluate(entries, 90))).toEqual([
      { kind: LiveStatusKind.Contract, label: "Delivery", isUncertain: true },
    ]);
    expect(evaluate(entries, 360)).toEqual([]);
  });

  test("a quiet session is uncertain, and a zone is never more certain than its session", () => {
    const entries = [
      entry(0, sessionStart()),
      entry(1, stateStart(LiveStatusKind.ArmisticeZone)),
    ];

    const [reporter] = evaluate(entries, 61);

    expect(reporter.presence).toBe(LiveStatusPresence.Uncertain);
    expect(statesOf([reporter])).toEqual([
      { kind: LiveStatusKind.ArmisticeZone, label: null, isUncertain: true },
    ]);
    expect(evaluate(entries, 241)).toEqual([]);
  });

  test("the silence of the own log ends the session in live mode", () => {
    const entries = [
      entry(0, sessionStart()),
      entry(1, stateStart(LiveStatusKind.ArmisticeZone)),
    ];

    const running = evaluate(entries, 120, {
      ownLogLineAt: at(115),
      isLiveModeActive: true,
    });
    expect(running[0].presence).toBe(LiveStatusPresence.Online);
    expect(running[0].states).toHaveLength(1);

    expect(
      evaluate(entries, 20, { ownLogLineAt: at(10), isLiveModeActive: true }),
    ).toEqual([]);

    const withoutLiveMode = evaluate(entries, 20, { ownLogLineAt: at(10) });
    expect(withoutLiveMode[0].presence).toBe(LiveStatusPresence.Uncertain);
  });

  test("the own log does not tell the session of another citizen", () => {
    const entries = [entry(0, sessionStart(), { isShared: true })];

    const [reporter] = evaluate(entries, 120, {
      ownLogLineAt: at(119),
      isLiveModeActive: true,
    });

    expect(reporter.presence).toBe(LiveStatusPresence.Uncertain);
  });

  test("a member line tells that the reporter is in a party", () => {
    const join = (minute: number, handle: string) =>
      entry(minute, { type: LiveStatusSignalType.PartyMemberJoin, handle });

    const entries = [
      join(0, "Bob"),
      join(1, "Carol"),
      entry(2, { type: LiveStatusSignalType.PartyMemberLeave, handle: "Bob" }),
      entry(3, {
        type: LiveStatusSignalType.PartyLeaderChange,
        handle: "Dave",
      }),
    ];

    expect(evaluate(entries, 4)[0].party).toEqual({
      since: at(0),
      isUncertain: false,
      members: ["Carol"],
      leader: "Dave",
    });
    expect(
      evaluate([...entries, entry(5, PARTY_END_SIGNAL)], 6)[0].party,
    ).toBeNull();
  });

  test("online reporters come first, then the most recent activity", () => {
    const entries = [
      entry(0, sessionStart(), { citizenId: "offline", isShared: true }),
      entry(1, stateStart(LiveStatusKind.Contract, "mission", "Delivery"), {
        citizenId: "offline",
        isShared: true,
      }),
      entry(2, SESSION_END_SIGNAL, { citizenId: "offline", isShared: true }),
      entry(3, sessionStart(), { citizenId: "early", isShared: true }),
      entry(4, sessionStart(), { citizenId: "late", isShared: true }),
      entry(5, sessionStart(), { citizenId: "gone", isShared: true }),
      entry(6, SESSION_END_SIGNAL, { citizenId: "gone", isShared: true }),
    ];

    expect(evaluate(entries, 7).map(({ key }) => key)).toEqual([
      "late",
      "early",
      "offline",
    ]);
  });
});

describe("Live-Status signals of the patterns", () => {
  const signalOf = (type: LogAnalyzerEntryType, line = SAMPLE_LINES[type]) => {
    const groups = matchLogAnalyzerEntryLine(type, line)?.groups;
    if (!groups) throw new Error(`The ${type} line does not match`);
    return deriveEntryFields(type, groups).liveStatusSignal;
  };

  test("the complete line of a contract gives the key of its accepted line", () => {
    expect(
      signalOf(LogAnalyzerEntryType.ContractCompleteNotificationV2),
    ).toEqual({
      type: LiveStatusSignalType.StateEnd,
      kind: LiveStatusKind.Contract,
      key: "bf7d2465-cf1e-480b-ae5c-25040d716e5f",
      label: "Wikelo Arrive to System",
    });
    expect(signalOf(LogAnalyzerEntryType.ContractAcceptedNotification)).toEqual(
      {
        type: LiveStatusSignalType.StateStart,
        kind: LiveStatusKind.Contract,
        key: "bf7d2465-cf1e-480b-ae5c-25040d716e5f",
        label: "Wikelo Arrive to System",
      },
    );
  });

  test("a mission id of only zeros gives no key", () => {
    const line =
      SAMPLE_LINES[LogAnalyzerEntryType.ContractWithdrawnNotification];

    expect(
      signalOf(LogAnalyzerEntryType.ContractWithdrawnNotificationV2, line),
    ).toMatchObject({ key: null, label: "A Call to Arms" });
  });

  test("a relocation ends the restricted area", () => {
    const relocated = SAMPLE_LINES[
      LogAnalyzerEntryType.RestrictedAreaNotification
    ].replace(
      "Restricted Area - Vehicles Will Be Impounded",
      "Restricted Area\r\n<2026-02-06T18:02:12.100Z> For your safety, you've been relocated.",
    );

    expect(
      signalOf(LogAnalyzerEntryType.RestrictedAreaNotification),
    ).toMatchObject({ type: LiveStatusSignalType.StateStart });
    expect(
      signalOf(LogAnalyzerEntryType.RestrictedAreaNotification, relocated),
    ).toMatchObject({ type: LiveStatusSignalType.StateEnd });
  });
});
