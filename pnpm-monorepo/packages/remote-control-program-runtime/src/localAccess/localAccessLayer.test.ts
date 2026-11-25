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
  it("after a Stop all of the owner, only the lines read live from the start go up", () => {
    const browser = createBrowser();
    const olderLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    browser.advance(60 * SECOND);

    const layer = startRuntime(browser);
    layer.setLogEntryTypes([LogAnalyzerEntryType.JoinPu], true);
    browser.advance(5 * SECOND);
    const liveLine = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );
    browser.advance(5 * SECOND);
    layer.heartbeat();
    expect(layer.selectAutomaticUploads([olderLine, liveLine])).toEqual([
      liveLine,
    ]);

    // The live line did not go up before the stop, for example because the relay was not available
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
    const lineAfterStart = createEntry(
      LogAnalyzerEntryType.JoinPu,
      browser.getTime(),
    );

    expect(
      layer.selectAutomaticUploads([
        olderLine,
        liveLine,
        stoppedLine,
        lineAfterStart,
      ]),
    ).toEqual([lineAfterStart]);
  });

  it.each([
    { gapSeconds: 20, isUploaded: true },
    { gapSeconds: 60, isUploaded: false },
  ])(
    "a change of the active tab after $gapSeconds seconds uploads the lines of the gap: $isUploaded",
    ({ gapSeconds, isUploaded }) => {
      const browser = createBrowser();
      const firstTab = startRuntime(browser);
      firstTab.setLogEntryTypes([LogAnalyzerEntryType.JoinPu], true);
      browser.advance(10 * SECOND);
      firstTab.heartbeat();

      // The tab crashes: the period ends at its last heartbeat
      browser.advance(5 * SECOND);
      const lineOfGap = createEntry(
        LogAnalyzerEntryType.JoinPu,
        browser.getTime(),
      );
      browser.advance(gapSeconds * SECOND - 5 * SECOND);

      const secondTab = startRuntime(browser);

      expect(secondTab.selectAutomaticUploads([lineOfGap])).toEqual(
        isUploaded ? [lineOfGap] : [],
      );
    },
  );

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
  });
});

describe("the request for older entries", () => {
  it("counts the older entries of the range whose types are on, and uploads them after the confirmation", () => {
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

    const request = layer.prepareOlderEntriesRequest(
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

    expect(request.countsByType).toEqual(
      new Map([
        [LogAnalyzerEntryType.JoinPu, 2],
        [LogAnalyzerEntryType.EarnedNotification, 1],
      ]),
    );

    layer.setLogEntryTypes([LogAnalyzerEntryType.EarnedNotification], false);
    expect(layer.selectPermittedUploads(request.entries)).toEqual([
      firstOlderLine,
      secondOlderLine,
    ]);

    layer.setRelayState(RelayUploadState.Stopped);
    expect(layer.selectPermittedUploads(request.entries)).toEqual([]);
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
});
