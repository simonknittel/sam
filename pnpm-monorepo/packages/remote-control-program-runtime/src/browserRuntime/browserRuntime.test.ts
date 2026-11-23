import {
  AcknowledgementResult,
  DownMessageType,
  LogAnalyzerEntryType,
  UpMessageType,
  createDownMessage,
  upMessageSchema,
  type DownMessage,
  type UpMessage,
  type UpMessageOfType,
} from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type {
  ChannelTimers,
  ChannelWebSocket,
  ChannelWebSocketHandlers,
} from "../channel/channelClient.js";
import { createLocalAccessLayer } from "../localAccess/localAccessLayer.js";
import type { RawMatch } from "../logFile/types.js";
import {
  BrowserRuntime,
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  type OwnEntryKeysPage,
  type OwnEntryKeysQuery,
} from "./browserRuntime.js";
import type { LogFolderReader } from "./logFolderReader.js";
import { OwnEntryStore } from "./ownEntryStore.js";

const RUNTIME_ID = "0b9f8a52-6d3e-4c55-9b7a-2f1c4d8e6a10";
const START_TIME = Date.parse("2026-11-23T18:00:00.000Z");
const SECOND = 1_000;
const DAY = 24 * 60 * 60 * SECOND;

/** The runtime only gives the handle to the reader */
const FOLDER = {} as FileSystemDirectoryHandle;

/** The clock of the fake timers of Vitest, for the runtime and the channel */
const TIMERS: ChannelTimers = {
  now: () => Date.now(),
  schedule: (callback, delayMilliseconds) => {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
  },
};

const createMemoryStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

class FakeWebSocket implements ChannelWebSocket {
  readonly sentMessages: UpMessage[] = [];

  constructor(readonly handlers: ChannelWebSocketHandlers) {}

  send(data: string) {
    const message = upMessageSchema.parse(JSON.parse(data));
    this.sentMessages.push(message);

    // Answers each heartbeat like a working relay
    if (message.type === UpMessageType.Heartbeat)
      queueMicrotask(() => this.acknowledge(message));
  }

  close() {}

  receive(message: DownMessage) {
    this.handlers.onMessage(JSON.stringify(message));
  }

  acknowledge(message: UpMessage) {
    this.receive(
      createDownMessage(DownMessageType.Acknowledgement, {
        message_id: message.id,
        result: AcknowledgementResult.Accepted,
      }),
    );
  }

  getSent<Type extends UpMessageType>(type: Type) {
    return this.sentMessages.filter(
      (message): message is UpMessageOfType<Type> => message.type === type,
    );
  }

  getSentRawLines() {
    return this.getSent(UpMessageType.FeedEntries).flatMap((message) =>
      message.content.entries.map((entry) => entry.raw_line),
    );
  }
}

/**
 * The log folder of the game. Each tab has its own reader, and each read
 * gives the lines since the last read of that reader.
 */
const createLogFolder = () => {
  const matches: RawMatch[] = [];

  return {
    write: (time: number) => {
      const lineNumber = matches.length + 1;
      const isoDate = new Date(time).toISOString();
      const match: RawMatch = {
        type: LogAnalyzerEntryType.JoinPu,
        isoDate,
        rawLine: `<${isoDate}> line ${lineNumber}`,
        hash: `hash-${lineNumber}`,
        groups: {},
        lineNumber,
      };
      matches.push(match);
      return match;
    },
    /** The relay calculates the key from the line */
    getHash: (rawLine: string) => {
      const match = matches.find((candidate) => candidate.rawLine === rawLine);
      if (!match) throw new Error("Unknown line");
      return match.hash;
    },
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

/** One browser: the storage and the log folder that all tabs share */
const createBrowser = () => {
  const storage = createMemoryStorage();
  const folder = createLogFolder();
  /** The keys of the entries that the relay has */
  const relayKeys = new Set<string>();
  const findOwnEntryKeys = vi.fn(
    async (_query: OwnEntryKeysQuery): Promise<OwnEntryKeysPage> => ({
      keys: Array.from(relayKeys),
      nextPageCursor: null,
    }),
  );

  /** The runtime of the tab that holds the Web Lock */
  const openTab = () => {
    const sockets: FakeWebSocket[] = [];

    const runtime = new BrowserRuntime({
      runtimeId: RUNTIME_ID,
      runtimeVersion: "1",
      storage,
      entryStore: new OwnEntryStore(),
      requestConnectionToken: async () => ({
        token: "token",
        relayUrl: new URL("wss://relay.example.test/"),
      }),
      findOwnEntryKeys,
      createLogFolderReader: () => folder.createReader(),
      createWebSocket: (_url, handlers) => {
        const socket = new FakeWebSocket(handlers);
        sockets.push(socket);
        return socket;
      },
      timers: TIMERS,
      random: () => 1,
    });

    /** Starts the runtime, and answers the handshake like the relay */
    const start = async () => {
      runtime.start(FOLDER);
      await vi.advanceTimersByTimeAsync(0);

      const socket = sockets.at(-1);
      if (!socket) throw new Error("No socket");

      socket.handlers.onOpen();
      socket.receive(
        createDownMessage(DownMessageType.Welcome, { is_stopped: false }),
      );
      const announcement = socket.getSent(UpMessageType.Announce).at(-1);
      if (!announcement) throw new Error("No announce");
      socket.acknowledge(announcement);
      await vi.advanceTimersByTimeAsync(0);

      return socket;
    };

    return { runtime, start };
  };

  /** The relay accepts the sent entries */
  const acknowledgeUploads = (socket: FakeWebSocket) => {
    for (const message of socket.getSent(UpMessageType.FeedEntries)) {
      socket.acknowledge(message);
      for (const entry of message.content.entries)
        relayKeys.add(folder.getHash(entry.raw_line));
    }
  };

  return {
    storage,
    folder,
    relayKeys,
    findOwnEntryKeys,
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
  createLocalAccessLayer({ storage: browser.storage }).setLogEntryTypes(
    [LogAnalyzerEntryType.JoinPu],
    true,
  );
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
    createLocalAccessLayer({ storage: browser.storage }).setLogEntryTypes(
      [LogAnalyzerEntryType.JoinPu],
      true,
    );

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
  createLocalAccessLayer({ storage: browser.storage }).setLogEntryTypes(
    [LogAnalyzerEntryType.JoinPu],
    true,
  );
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
