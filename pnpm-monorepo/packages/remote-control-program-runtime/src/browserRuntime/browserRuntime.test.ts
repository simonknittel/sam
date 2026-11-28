import {
  CapabilityId,
  DownMessageType,
  LogAnalyzerEntryType,
  UpMessageType,
  createDownMessage,
  isInVisibleTimeRange,
} from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createLocalAccessLayer } from "../localAccess/localAccessLayer.js";
import type { RawMatch } from "../logFile/types.js";
import {
  FAKE_TIMERS,
  FakeWebSocket,
  createMemoryStorage,
} from "../testing/fakes.js";
import { BrowserRuntime } from "./browserRuntime.js";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
} from "./browserRuntimeState.js";
import type { LogFolderReader } from "./logFolderReader.js";
import { MAXIMUM_OWN_ENTRIES, OwnEntryStore } from "./ownEntryStore.js";

const CITIZEN_ID = "citizen";
const RUNTIME_ID = "0b9f8a52-6d3e-4c55-9b7a-2f1c4d8e6a10";
const START_TIME = Date.parse("2026-11-23T18:00:00.000Z");
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

/** The runtime only gives the handle to the reader */
const FOLDER = {} as FileSystemDirectoryHandle;
const OTHER_FOLDER = {} as FileSystemDirectoryHandle;

/** A key in the format of the relay (`createLogEntryHash`) */
const createKey = (name: string, lineNumber: number) =>
  Array.from(new TextEncoder().encode(`${name}-${lineNumber}`), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .padEnd(64, "0");

/**
 * A log folder of the game. Each tab has its own reader, and each read
 * gives the lines of its windows that this reader did not read before.
 */
const createLogFolder = (name: string) => {
  const matches: RawMatch[] = [];
  let readMilliseconds = 0;
  /** False: the owner selected a folder without the log files of the game */
  let hasChannelFolder = true;

  return {
    setReadMilliseconds: (milliseconds: number) => {
      readMilliseconds = milliseconds;
    },
    setHasChannelFolder: (value: boolean) => {
      hasChannelFolder = value;
    },
    write: (time: number) => {
      const lineNumber = matches.length + 1;
      const isoDate = new Date(time).toISOString();
      const match: RawMatch = {
        type: LogAnalyzerEntryType.JoinPu,
        isoDate,
        rawLine: `<${isoDate}> ${name} line ${lineNumber}`,
        hash: createKey(name, lineNumber),
        groups: {},
        lineNumber,
        gameChannel: "LIVE",
        gameVersion: "4.10.201.48085",
      };
      matches.push(match);
      return match;
    },
    /** The relay calculates the key from the line */
    findHash: (rawLine: string) =>
      matches.find((candidate) => candidate.rawLine === rawLine)?.hash,
    createReader: (): LogFolderReader => {
      const readHashes = new Set<string>();
      let stopRead = () => {};

      return {
        read: async (windows) => {
          const isStopped =
            readMilliseconds > 0 &&
            (await new Promise<boolean>((resolve) => {
              setTimeout(() => resolve(false), readMilliseconds);
              stopRead = () => resolve(true);
            }));

          const newMatches = isStopped
            ? []
            : matches.filter(
                ({ hash, isoDate }) =>
                  !readHashes.has(hash) &&
                  windows.some((window) =>
                    isInVisibleTimeRange(window, new Date(isoDate)),
                  ),
              );
          for (const { hash } of newMatches) readHashes.add(hash);

          return {
            matches: newMatches,
            newestIsoDate: matches.at(-1)?.isoDate ?? null,
            isStopped,
            oldestSessionStart: null,
            hasChannelFolder,
          };
        },
        stopRead: () => stopRead(),
        dispose: () => {},
      };
    },
  };
};

/** One browser profile: the storage and the log folders that all tabs share */
const createBrowser = () => {
  const storage = createMemoryStorage();
  const folder = createLogFolder("live");
  const otherFolder = createLogFolder("ptu");
  /** The keys of the entries that the relay has */
  const relayKeys = new Set<string>();
  /** The connections of all tabs */
  const allSockets: FakeWebSocket[] = [];

  /** The content of each `feed_entry_keys_request` of all tabs */
  const getKeyRequests = () =>
    allSockets.flatMap((socket) =>
      socket
        .getSent(UpMessageType.FeedEntryKeysRequest)
        .map((message) => message.content),
    );

  /** Turns on the type of the lines for the citizen */
  const turnOnLines = (citizenId = CITIZEN_ID) =>
    createLocalAccessLayer({ storage, citizenId }).setLogEntryTypes(
      [LogAnalyzerEntryType.JoinPu],
      true,
    );

  /** The runtime of the tab that holds the Web Lock of the citizen */
  const openTab = (citizenId = CITIZEN_ID) => {
    const sockets: FakeWebSocket[] = [];

    const runtime = new BrowserRuntime({
      citizenId,
      runtimeId: RUNTIME_ID,
      runtimeVersion: "1",
      storage,
      entryStore: new OwnEntryStore(),
      requestConnectionToken: async () => ({
        token: "token",
        relayUrl: new URL("wss://relay.example.test/"),
      }),
      createLogFolderReader: (handle) =>
        (handle === OTHER_FOLDER ? otherFolder : folder).createReader(),
      createWebSocket: (_url, handlers) => {
        const socket = new FakeWebSocket(handlers);
        socket.ownEntryKeys = () => Array.from(relayKeys);
        sockets.push(socket);
        allSockets.push(socket);
        return socket;
      },
      timers: FAKE_TIMERS,
      random: () => 1,
    });

    /** Answers the handshake of the last connection like the relay */
    const handshake = async () => {
      const socket = sockets.at(-1);
      if (!socket) throw new Error("No socket");

      socket.handlers.onOpen();
      socket.receive(createDownMessage(DownMessageType.Welcome, {}));
      const announcement = socket.getSent(UpMessageType.Announce).at(-1);
      if (!announcement) throw new Error("No announce");
      socket.acknowledge(announcement);
      await vi.advanceTimersByTimeAsync(0);

      return socket;
    };

    const start = async (handle = FOLDER) => {
      runtime.start(handle);
      await vi.advanceTimersByTimeAsync(0);
      return handshake();
    };

    /** All lines that the connections of the runtime sent */
    const getSentRawLines = () =>
      sockets.flatMap((socket) => socket.getSentRawLines());

    return { runtime, start, handshake, getSentRawLines };
  };

  /** The relay accepts the sent entries */
  const acknowledgeUploads = (socket: FakeWebSocket) => {
    for (const message of socket.getSent(UpMessageType.FeedEntries)) {
      socket.acknowledge(message);
      for (const entry of message.content.entries) {
        const hash =
          folder.findHash(entry.raw_line) ??
          otherFolder.findHash(entry.raw_line);
        if (hash === undefined) throw new Error("Unknown line");
        relayKeys.add(hash);
      }
    }
  };

  return {
    folder,
    otherFolder,
    relayKeys,
    getKeyRequests,
    turnOnLines,
    openTab,
    acknowledgeUploads,
  };
};

beforeEach(() => {
  vi.useFakeTimers({ now: START_TIME });
});

afterEach(() => {
  vi.useRealTimers();
});

test("after a change of the active tab, the next runtime sends only the entries that the relay does not have", async () => {
  const browser = createBrowser();
  browser.turnOnLines();
  // From a time without a running runtime: it stays on the machine
  browser.folder.write(START_TIME - 60 * SECOND);

  const firstTab = browser.openTab();
  const firstSocket = await firstTab.start();

  await vi.advanceTimersByTimeAsync(5 * SECOND);
  const acceptedEntry = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(firstSocket.getSentRawLines()).toEqual([acceptedEntry.rawLine]);
  browser.acknowledgeUploads(firstSocket);

  const unacknowledgedEntry = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(firstSocket.getSentRawLines()).toEqual([
    acceptedEntry.rawLine,
    unacknowledgedEntry.rawLine,
  ]);
  // The first tab did not check the relay: its first read had no entry
  // that can go up
  expect(browser.getKeyRequests()).toEqual([]);

  // The tab closes before the `ack` of the second entry
  firstTab.runtime.handOver();
  await vi.advanceTimersByTimeAsync(2 * SECOND);

  const secondTab = browser.openTab();
  expect(secondTab.runtime.shouldRun(false)).toBe(true);
  const secondSocket = await secondTab.start();

  expect(browser.getKeyRequests()).toEqual([
    {
      capability_id: CapabilityId.LogEntries,
      start: acceptedEntry.isoDate,
      end: new Date(Date.parse(unacknowledgedEntry.isoDate) + 1).toISOString(),
    },
  ]);
  expect(secondSocket.getSentRawLines()).toEqual([unacknowledgedEntry.rawLine]);

  // A new line goes up without a second check
  const liveEntry = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(secondSocket.getSentRawLines()).toEqual([
    unacknowledgedEntry.rawLine,
    liveEntry.rawLine,
  ]);
  expect(browser.getKeyRequests()).toHaveLength(1);

  // A stop of the owner stays after the next change of the active tab
  secondTab.runtime.stop();
  secondTab.runtime.handOver();
  expect(browser.openTab().runtime.shouldRun(true)).toBe(false);
});

test.each([
  {
    end: "a stop of the owner",
    isGapUploaded: false,
    endAndStartAgain: async (
      browser: ReturnType<typeof createBrowser>,
      tab: ReturnType<ReturnType<typeof createBrowser>["openTab"]>,
      writeGapLine: () => RawMatch,
    ) => {
      tab.runtime.stop();
      await vi.advanceTimersByTimeAsync(5 * SECOND);
      const gapLine = writeGapLine();
      await vi.advanceTimersByTimeAsync(5 * SECOND);

      return { gapLine, socket: await tab.start() };
    },
  },
  {
    end: "a change of the active tab",
    isGapUploaded: true,
    endAndStartAgain: async (
      browser: ReturnType<typeof createBrowser>,
      tab: ReturnType<ReturnType<typeof createBrowser>["openTab"]>,
      writeGapLine: () => RawMatch,
    ) => {
      tab.runtime.handOver();
      await vi.advanceTimersByTimeAsync(5 * SECOND);
      const gapLine = writeGapLine();
      await vi.advanceTimersByTimeAsync(5 * SECOND);

      const nextTab = browser.openTab();
      expect(nextTab.runtime.shouldRun(false)).toBe(true);
      return { gapLine, socket: await nextTab.start() };
    },
  },
])(
  "after $end and a start within 30 seconds, the lines of the gap go up: $isGapUploaded",
  async ({ isGapUploaded, endAndStartAgain }) => {
    const browser = createBrowser();
    browser.turnOnLines();

    const tab = browser.openTab();
    const firstSocket = await tab.start();
    await vi.advanceTimersByTimeAsync(5 * SECOND);
    const liveLine = browser.folder.write(Date.now());
    await vi.advanceTimersByTimeAsync(10 * SECOND);
    expect(firstSocket.getSentRawLines()).toEqual([liveLine.rawLine]);
    browser.acknowledgeUploads(firstSocket);

    const { gapLine, socket } = await endAndStartAgain(browser, tab, () =>
      browser.folder.write(Date.now()),
    );
    const lineAfterStart = browser.folder.write(Date.now());
    await vi.advanceTimersByTimeAsync(10 * SECOND);

    expect(socket.getSentRawLines()).toEqual(
      isGapUploaded
        ? [gapLine.rawLine, lineAfterStart.rawLine]
        : [lineAfterStart.rawLine],
    );
  },
);

test("a request for older entries leaves out the entries that go up automatically and the entries that the relay has", async () => {
  const browser = createBrowser();
  browser.turnOnLines();
  const sharedEntry = browser.folder.write(START_TIME - 2 * DAY);
  const olderEntry = browser.folder.write(START_TIME - DAY);
  browser.relayKeys.add(sharedEntry.hash);

  const tab = browser.openTab();
  const socket = await tab.start();
  const liveEntry = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(socket.getSentRawLines()).toEqual([liveEntry.rawLine]);

  const request = await tab.runtime.prepareOlderEntriesRequest({
    start: new Date(START_TIME - 3 * DAY),
    end: null,
  });
  expect(request).toMatchObject({
    entryCount: 1,
    countsByType: new Map([[LogAnalyzerEntryType.JoinPu, 1]]),
  });
  expect(browser.getKeyRequests().at(-1)).toEqual({
    capability_id: CapabilityId.LogEntries,
    start: sharedEntry.isoDate,
    end: new Date(Date.parse(olderEntry.isoDate) + 1).toISOString(),
  });

  expect(tab.runtime.confirmOlderEntriesRequest(request.id)).toBe(1);
  await vi.advanceTimersByTimeAsync(SECOND);
  expect(socket.getSentRawLines()).toEqual([
    liveEntry.rawLine,
    olderEntry.rawLine,
  ]);

  expect(() => tab.runtime.confirmOlderEntriesRequest(request.id)).toThrow(
    new BrowserRuntimeError(BrowserRuntimeErrorCode.RequestExpired),
  );
});

test("after a change of the log folder, no line of the new folder goes up from the live periods of the previous folder", async () => {
  const browser = createBrowser();
  browser.turnOnLines();

  const tab = browser.openTab();
  await tab.start(FOLDER);
  await vi.advanceTimersByTimeAsync(10 * MINUTE);
  // No runtime reads the other folder live
  browser.otherFolder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * MINUTE);

  await tab.start(OTHER_FOLDER);
  const lineAfterChange = browser.otherFolder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);

  expect(tab.getSentRawLines()).toEqual([lineAfterChange.rawLine]);
});

test("the citizens of one browser profile do not share the run record, the rules or the live periods", async () => {
  const browser = createBrowser();
  browser.turnOnLines("first-citizen");

  const firstTab = browser.openTab("first-citizen");
  await firstTab.start();
  await vi.advanceTimersByTimeAsync(5 * SECOND);
  const lineOfFirstCitizen = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  // The relay did not confirm the line yet
  expect(firstTab.getSentRawLines()).toEqual([lineOfFirstCitizen.rawLine]);

  // The first citizen closes the tab, and a second citizen logs in
  firstTab.runtime.handOver();
  await vi.advanceTimersByTimeAsync(2 * SECOND);

  const secondTab = browser.openTab("second-citizen");
  expect(secondTab.runtime.shouldRun(false)).toBe(false);
  expect(
    secondTab.runtime.getLocalAccessSettings().logEntryTypes[
      LogAnalyzerEntryType.JoinPu
    ],
  ).toBe(false);

  browser.turnOnLines("second-citizen");
  await secondTab.start();
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(secondTab.getSentRawLines()).toEqual([]);

  // The first citizen continues the own live period
  const nextTabOfFirstCitizen = browser.openTab("first-citizen");
  await nextTabOfFirstCitizen.start();
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(nextTabOfFirstCitizen.getSentRawLines()).toEqual([
    lineOfFirstCitizen.rawLine,
  ]);
});

test("tells that a read takes long, but not for the short reads", async () => {
  const browser = createBrowser();
  const { runtime } = browser.openTab();
  const isReadingStates: boolean[] = [];
  runtime.subscribe((state) => isReadingStates.push(state.isReading));

  browser.folder.setReadMilliseconds(3 * SECOND);
  runtime.start(FOLDER);
  await vi.advanceTimersByTimeAsync(SECOND);
  expect(runtime.getState().isReading).toBe(true);
  await vi.advanceTimersByTimeAsync(3 * SECOND);
  expect(runtime.getState().isReading).toBe(false);

  isReadingStates.length = 0;
  browser.folder.setReadMilliseconds(100);
  await vi.advanceTimersByTimeAsync(30 * SECOND);
  expect(isReadingStates.length).toBeGreaterThan(0);
  expect(isReadingStates).not.toContain(true);

  // A stop ends the state also during a read
  browser.folder.setReadMilliseconds(30 * SECOND);
  await vi.advanceTimersByTimeAsync(15 * SECOND);
  expect(runtime.getState().isReading).toBe(true);
  runtime.stop();
  expect(runtime.getState().isReading).toBe(false);
});

test("tells that the log folder has no channel folder until the owner selects a different folder", async () => {
  const browser = createBrowser();
  browser.folder.setHasChannelFolder(false);
  const tab = browser.openTab();

  await tab.start(FOLDER);
  expect(tab.runtime.getState().error).toBe(
    BrowserRuntimeErrorCode.NoChannelFolder,
  );

  await tab.start(OTHER_FOLDER);
  await vi.advanceTimersByTimeAsync(0);
  expect(tab.runtime.getState().error).toBeNull();
});

const createBrowserWithOlderEntries = async () => {
  const browser = createBrowser();
  browser.turnOnLines();
  browser.folder.write(START_TIME - 60 * DAY);
  browser.folder.write(START_TIME - 40 * DAY);
  const { runtime, start } = browser.openTab();
  await start();

  browser.folder.setReadMilliseconds(5 * SECOND);
  // The scheduled read is in flight
  await vi.advanceTimersByTimeAsync(11 * SECOND);

  return {
    runtime,
    countSince: (days: number) =>
      runtime.prepareOlderEntriesRequest({
        start: new Date(START_TIME - days * DAY),
        end: null,
      }),
  };
};

test("a newer count replaces an older one and reads its own range", async () => {
  const { runtime, countSince } = await createBrowserWithOlderEntries();

  const replacedCount = countSince(50);
  const expectReplaced = expect(replacedCount).rejects.toThrow(
    new BrowserRuntimeError(BrowserRuntimeErrorCode.RequestExpired),
  );
  const count = countSince(90);
  await vi.advanceTimersByTimeAsync(30 * SECOND);

  await expectReplaced;
  const { id, entryCount } = await count;
  expect(entryCount).toBe(2);
  expect(runtime.confirmOlderEntriesRequest(id)).toBe(2);
});

test("a count reads its range completely when a control UI stops its read", async () => {
  const { runtime, countSince } = await createBrowserWithOlderEntries();

  const count = countSince(90);
  await vi.advanceTimersByTimeAsync(2 * SECOND);
  // The Log Analyzer of a different tab
  runtime.setRequestedWindow({
    start: new Date(START_TIME - 20 * DAY),
    end: null,
  });
  await vi.advanceTimersByTimeAsync(30 * SECOND);

  await expect(count).resolves.toMatchObject({ entryCount: 2 });
});

test("refuses a count whose oldest entries left the memory", async () => {
  const browser = createBrowser();
  browser.turnOnLines();
  for (let index = 0; index <= MAXIMUM_OWN_ENTRIES; index += 1)
    browser.folder.write(START_TIME - 60 * DAY + index);
  const tab = browser.openTab();
  await tab.start();

  await expect(
    tab.runtime.prepareOlderEntriesRequest({ start: null, end: null }),
  ).rejects.toThrow(
    new BrowserRuntimeError(BrowserRuntimeErrorCode.TooManyEntries),
  );
  await expect(
    tab.runtime.prepareOlderEntriesRequest({
      start: new Date(START_TIME - DAY),
      end: null,
    }),
  ).resolves.toMatchObject({ entryCount: 0 });
});
