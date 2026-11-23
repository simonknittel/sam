import {
  DownMessageType,
  LogAnalyzerEntryType,
  UpMessageType,
  createDownMessage,
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
import { OwnEntryStore } from "./ownEntryStore.js";
import type { OwnEntryKeysPage, OwnEntryKeysQuery } from "./relayKeys.js";

const CITIZEN_ID = "citizen";
const RUNTIME_ID = "0b9f8a52-6d3e-4c55-9b7a-2f1c4d8e6a10";
const START_TIME = Date.parse("2026-11-23T18:00:00.000Z");
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

/** The runtime only gives the handle to the reader */
const FOLDER = {} as FileSystemDirectoryHandle;
const OTHER_FOLDER = {} as FileSystemDirectoryHandle;

/**
 * A log folder of the game. Each tab has its own reader, and each read
 * gives the lines since the last read of that reader.
 */
const createLogFolder = (name: string) => {
  const matches: RawMatch[] = [];

  return {
    write: (time: number) => {
      const lineNumber = matches.length + 1;
      const isoDate = new Date(time).toISOString();
      const match: RawMatch = {
        type: LogAnalyzerEntryType.JoinPu,
        isoDate,
        rawLine: `<${isoDate}> ${name} line ${lineNumber}`,
        hash: `${name}-hash-${lineNumber}`,
        groups: {},
        lineNumber,
      };
      matches.push(match);
      return match;
    },
    /** The relay calculates the key from the line */
    findHash: (rawLine: string) =>
      matches.find((candidate) => candidate.rawLine === rawLine)?.hash,
    createReader: (): LogFolderReader => {
      let readCount = 0;

      return {
        read: async () => {
          const newMatches = matches.slice(readCount);
          readCount = matches.length;

          return {
            matches: newMatches,
            newestIsoDate: matches.at(-1)?.isoDate ?? null,
            selection: {
              fileCount: 1,
              selectedFileCount: 1,
              selectedByteCount: 0,
              oldestSessionStart: null,
            },
          };
        },
        stopRead: () => {},
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
  const findOwnEntryKeys = vi.fn(
    async (_query: OwnEntryKeysQuery): Promise<OwnEntryKeysPage> => ({
      keys: Array.from(relayKeys),
      nextPageCursor: null,
    }),
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
      findOwnEntryKeys,
      createLogFolderReader: (handle) =>
        (handle === OTHER_FOLDER ? otherFolder : folder).createReader(),
      createWebSocket: (_url, handlers) => {
        const socket = new FakeWebSocket(handlers);
        sockets.push(socket);
        return socket;
      },
      timers: FAKE_TIMERS,
      random: () => 1,
    });

    /** Answers the handshake of the last connection like the relay */
    const handshake = async (isStopped = false) => {
      const socket = sockets.at(-1);
      if (!socket) throw new Error("No socket");

      socket.handlers.onOpen();
      socket.receive(
        createDownMessage(DownMessageType.Welcome, { is_stopped: isStopped }),
      );
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
    findOwnEntryKeys,
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
  expect(browser.findOwnEntryKeys).not.toHaveBeenCalled();

  // The tab closes before the `ack` of the second entry
  firstTab.runtime.handOver();
  await vi.advanceTimersByTimeAsync(2 * SECOND);

  const secondTab = browser.openTab();
  expect(secondTab.runtime.shouldRun(false)).toBe(true);
  const secondSocket = await secondTab.start();

  expect(browser.findOwnEntryKeys).toHaveBeenCalledExactlyOnceWith({
    start: new Date(acceptedEntry.isoDate),
    end: new Date(Date.parse(unacknowledgedEntry.isoDate) + 1),
    pageCursor: null,
  });
  expect(secondSocket.getSentRawLines()).toEqual([unacknowledgedEntry.rawLine]);

  // A new line goes up without a second check
  const liveEntry = browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);
  expect(secondSocket.getSentRawLines()).toEqual([
    unacknowledgedEntry.rawLine,
    liveEntry.rawLine,
  ]);
  expect(browser.findOwnEntryKeys).toHaveBeenCalledOnce();

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
  expect(browser.findOwnEntryKeys).toHaveBeenLastCalledWith({
    start: new Date(sharedEntry.isoDate),
    end: new Date(Date.parse(olderEntry.isoDate) + 1),
    pageCursor: null,
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

test("a Stop all of the owner that the runtime learns at a reconnect keeps the lines of the disconnect on the machine, also after the start and a change of the active tab", async () => {
  const browser = createBrowser();
  browser.turnOnLines();

  const tab = browser.openTab();
  const firstSocket = await tab.start();
  firstSocket.handlers.onClose(1006);
  await vi.advanceTimersByTimeAsync(5 * SECOND);
  // The line of the disconnect
  browser.folder.write(Date.now());
  await vi.advanceTimersByTimeAsync(10 * SECOND);

  // The owner stopped all during the disconnect, and starts again later
  const secondSocket = await tab.handshake(true);
  secondSocket.receive(createDownMessage(DownMessageType.Start, {}));
  await vi.advanceTimersByTimeAsync(10 * SECOND);

  tab.runtime.handOver();
  const nextTab = browser.openTab();
  await nextTab.start();
  await vi.advanceTimersByTimeAsync(10 * SECOND);

  expect([...tab.getSentRawLines(), ...nextTab.getSentRawLines()]).toEqual([]);
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
