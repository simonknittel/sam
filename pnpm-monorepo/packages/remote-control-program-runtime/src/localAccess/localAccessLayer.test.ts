import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/fakes.js";
import {
  createLocalAccessLayer,
  RelayUploadState,
} from "./localAccessLayer.js";

const SECOND = 1_000;

const CITIZEN_ID = "citizen";

/** One storage and one clock for all tabs of a browser */
const createBrowser = (initialValues?: Record<string, string>) => {
  const storage = createMemoryStorage(initialValues);
  let time = Date.parse("2026-11-23T18:00:00.000Z");

  return {
    storage,
    advance: (milliseconds: number) => {
      time += milliseconds;
    },
    getTime: () => time,
    openTab: () =>
      createLocalAccessLayer({
        storage,
        citizenId: CITIZEN_ID,
        now: () => new Date(time),
      }),
  };
};

const createEntry = (type: LogAnalyzerEntryType, time: number) => ({
  type,
  isoDate: new Date(time).toISOString(),
});

/** The runtime of a tab after the `welcome` of the relay */
const startRuntime = (browser: ReturnType<typeof createBrowser>) => {
  const layer = browser.openTab();
  layer.startReading();
  layer.setRelayState(RelayUploadState.Accepting);
  return layer;
};

describe("the rule for the upload", () => {
  it("only the entries from the start of the reading go up, also after a short restart", () => {
    const browser = createBrowser();
    const lineBeforeStart = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    browser.advance(60 * SECOND);

    const layer = startRuntime(browser);
    layer.setLogEntryTypes([LogAnalyzerEntryType.JoinPu], true);
    browser.advance(5 * SECOND);
    const lineAfterStart = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    expect(
      layer.selectAutomaticUploads([lineBeforeStart, lineAfterStart]),
    ).toEqual([lineAfterStart]);

    // Before the `welcome` of a new connection, the entries wait in the outbox of the runtime
    layer.setRelayState(RelayUploadState.Unknown);
    expect(layer.selectAutomaticUploads([lineAfterStart])).toEqual([
      lineAfterStart,
    ]);

    // The next runtime, also after a change of the active tab, reads live from its own start
    layer.stopReading();
    expect(layer.selectAutomaticUploads([lineAfterStart])).toEqual([]);
    browser.advance(5 * SECOND);
    const lineWithoutRuntime = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    browser.advance(5 * SECOND);
    const nextRuntime = startRuntime(browser);
    browser.advance(5 * SECOND);
    const lineOfNextRuntime = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    expect(
      nextRuntime.selectAutomaticUploads([
        lineBeforeStart,
        lineAfterStart,
        lineWithoutRuntime,
        lineOfNextRuntime,
      ]),
    ).toEqual([lineOfNextRuntime]);

    // A different log folder starts the reading again
    nextRuntime.stopReading();
    browser.advance(5 * SECOND);
    nextRuntime.startReading();
    expect(nextRuntime.getReadsLiveSince()).toEqual(
      new Date(browser.getTime()),
    );
    expect(nextRuntime.selectAutomaticUploads([lineOfNextRuntime])).toEqual([]);
  });

  it("after a switch, only the lines read live from its end go up", () => {
    const browser = createBrowser();
    const layer = startRuntime(browser);
    layer.setLogEntryTypes([LogAnalyzerEntryType.JoinPu], true);
    browser.advance(5 * SECOND);
    const liveLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );

    // The live line did not go up before the switch, for example because the relay was not available
    layer.setRelayState(RelayUploadState.Stopped);
    browser.advance(5 * SECOND);
    const stoppedLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    expect(layer.selectAutomaticUploads([liveLine])).toEqual([]);

    browser.advance(5 * SECOND);
    layer.setRelayState(RelayUploadState.Accepting);
    browser.advance(5 * SECOND);
    const lineAfterSwitch = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    expect(
      layer.selectAutomaticUploads([liveLine, stoppedLine, lineAfterSwitch]),
    ).toEqual([lineAfterSwitch]);
  });

  it("uploads the lines of a type that turns on later only from that time, also of its newer versions", () => {
    const browser = createBrowser();
    const layer = startRuntime(browser);
    browser.advance(10 * SECOND);
    const lineBeforeTurnOn = createEntry(
      LogAnalyzerEntryType.ContractCompleteNotificationV2,
      browser.getTime(),
    );
    browser.advance(10 * SECOND);

    layer.setLogEntryTypes(
      [LogAnalyzerEntryType.ContractCompleteNotification],
      true,
    );
    browser.advance(10 * SECOND);
    const lineAfterTurnOn = createEntry(
      LogAnalyzerEntryType.ContractCompleteNotificationV2,
      browser.getTime(),
    );
    const lineOfTypeThatIsOff = createEntry(
      LogAnalyzerEntryType.OwnDeath,
      browser.getTime(),
    );

    expect(
      layer.selectAutomaticUploads([
        lineBeforeTurnOn,
        lineAfterTurnOn,
        lineOfTypeThatIsOff,
      ]),
    ).toEqual([lineAfterTurnOn]);

    // A type that turns off stops also its waiting entries
    layer.setLogEntryTypes(
      [LogAnalyzerEntryType.ContractCompleteNotificationV2],
      false,
    );
    expect(layer.selectAutomaticUploads([lineAfterTurnOn])).toEqual([]);
  });
});

describe("the request for older entries", () => {
  it("selects the older entries of the range whose types are on, and uploads them after the confirmation", () => {
    const browser = createBrowser();
    const firstOlderLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    const secondOlderLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime() + SECOND,
    );
    const olderLineOfOtherType = createEntry(
      LogAnalyzerEntryType.EarnedNotificationV2,
      browser.getTime() + SECOND,
    );
    const olderLineOfTypeThatIsOff = createEntry(
      LogAnalyzerEntryType.OwnDeath,
      browser.getTime() + SECOND,
    );
    const lineBeforeRange = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime() - 60 * SECOND,
    );
    browser.advance(60 * SECOND);

    const layer = startRuntime(browser);
    layer.setLogEntryTypes(
      [LogAnalyzerEntryType.JoinPu, LogAnalyzerEntryType.EarnedNotification],
      true,
    );
    browser.advance(5 * SECOND);
    const liveLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );

    const olderEntries = layer.selectOlderEntries(
      [
        firstOlderLine,
        secondOlderLine,
        olderLineOfOtherType,
        olderLineOfTypeThatIsOff,
        lineBeforeRange,
        liveLine,
      ],
      { start: new Date(firstOlderLine.isoDate), end: null },
    );

    expect(olderEntries).toEqual([
      firstOlderLine,
      secondOlderLine,
      olderLineOfOtherType,
    ]);

    layer.setLogEntryTypes([LogAnalyzerEntryType.EarnedNotification], false);
    expect(layer.selectPermittedUploads(olderEntries)).toEqual([
      firstOlderLine,
      secondOlderLine,
    ]);

    layer.setRelayState(RelayUploadState.Stopped);
    expect(layer.selectPermittedUploads(olderEntries)).toEqual([]);
  });
});

describe("the storage", () => {
  it("removes the share settings of the old Log Analyzer and does not take them over", () => {
    const browser = createBrowser({
      log_analyzer_share_types: JSON.stringify({ joinPu: true }),
    });

    const layer = browser.openTab();

    expect(browser.storage.values.has("log_analyzer_share_types")).toBe(false);
    expect(layer.getSettings().logEntryTypes[LogAnalyzerEntryType.JoinPu]).toBe(
      false,
    );
  });

  it("loads the rules next to the live periods of an earlier version, and removes the periods at the next write", () => {
    const livePeriodsKey = `remote_control_program_live_periods:${CITIZEN_ID}`;
    const browser = createBrowser({
      [`remote_control_program_local_access_layer:${CITIZEN_ID}`]:
        JSON.stringify({
          version: 1,
          log_entry_types: [
            { type: "joinPu", turned_on_at: "2026-11-23T17:00:00.000Z" },
          ],
        }),
      [livePeriodsKey]: JSON.stringify({
        version: 1,
        periods: [
          {
            started_at: "2026-11-23T17:00:00.000Z",
            ended_at: "2026-11-23T17:59:50.000Z",
          },
        ],
        can_continue_last_period: true,
      }),
    });
    const lineOfLivePeriod = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime() - 30 * SECOND,
    );

    const layer = startRuntime(browser);
    expect(layer.getSettings().logEntryTypes[LogAnalyzerEntryType.JoinPu]).toBe(
      true,
    );
    expect(layer.selectAutomaticUploads([lineOfLivePeriod])).toEqual([]);

    layer.setLogEntryTypes([LogAnalyzerEntryType.OwnDeath], true);
    expect(browser.storage.values.has(livePeriodsKey)).toBe(false);
    expect(layer.getSettings().logEntryTypes).toMatchObject({
      [LogAnalyzerEntryType.JoinPu]: true,
      [LogAnalyzerEntryType.OwnDeath]: true,
    });
  });
});
