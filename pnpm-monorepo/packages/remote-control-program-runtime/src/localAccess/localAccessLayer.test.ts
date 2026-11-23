import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { describe, expect, it } from "vitest";
import { createLocalAccessLayer } from "./localAccessLayer.js";
import {
  LIVE_PERIODS_STORAGE_KEY,
  LOCAL_ACCESS_LAYER_STORAGE_KEY,
} from "./localAccessStorage.js";

const SECOND = 1_000;

const createMemoryStorage = (initialValues: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initialValues));

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

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
      createLocalAccessLayer({ storage, now: () => new Date(time) }),
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
  layer.setRelayStopped(false);
  return layer;
};

describe("the rule for the upload", () => {
  it.each([
    {
      stop: "the Stop all of this browser",
      stopAll: (layer: ReturnType<typeof startRuntime>) => layer.stopAll(),
      startAll: (layer: ReturnType<typeof startRuntime>) => layer.startAll(),
    },
    {
      stop: "the Stop all of the owner from the relay",
      stopAll: (layer: ReturnType<typeof startRuntime>) =>
        layer.setRelayStopped(true),
      startAll: (layer: ReturnType<typeof startRuntime>) =>
        layer.setRelayStopped(false),
    },
  ])(
    "uploads a line of a live period, but not a line before the start or from $stop",
    ({ stopAll, startAll }) => {
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

      stopAll(layer);
      browser.advance(5 * SECOND);
      const stoppedLine = createEntry(
        LogAnalyzerEntryType.JoinPu,
        browser.getTime(),
      );
      expect(layer.selectAutomaticUploads([liveLine])).toEqual([]);

      browser.advance(5 * SECOND);
      startAll(layer);
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
      ).toEqual([liveLine, lineAfterStart]);
    },
  );

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
    expect(layer.confirmOlderEntriesRequest(request)).toEqual([
      firstOlderLine,
      secondOlderLine,
    ]);

    layer.stopAll();
    expect(layer.confirmOlderEntriesRequest(request)).toEqual([]);
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

  it("gives the defaults for a broken stored value", () => {
    const browser = createBrowser({
      [LOCAL_ACCESS_LAYER_STORAGE_KEY]: "{not json",
      // The period contains the time of the entry below. The flag is not valid.
      [LIVE_PERIODS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        periods: [
          {
            started_at: "2026-11-23T17:00:00.000Z",
            ended_at: "2026-11-23T19:00:00.000Z",
          },
        ],
        can_continue_last_period: "yes",
      }),
    });

    const layer = browser.openTab();

    expect(layer.getSettings().stoppedAt).toBeNull();
    expect(layer.getAnnouncementSummary()).toEqual({
      is_stopped: false,
      capability_rules: [
        { capability_id: "log_entries", is_on: false, is_filtered: false },
      ],
    });

    layer.setLogEntryTypes([LogAnalyzerEntryType.JoinPu], true);
    layer.setRelayStopped(false);
    expect(
      layer.selectAutomaticUploads([
        createEntry(LogAnalyzerEntryType.JoinPu, browser.getTime()),
      ]),
    ).toEqual([]);
  });
});
