import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CONNECTOR_CATALOG,
  CapabilityId,
  ConnectorId,
  DownMessageType,
  LOG_ENTRIES_CAPABILITY,
  LogAnalyzerEntryType,
  RELAY_CLOSE_CODES,
  RelayCloseReason,
  RuntimeKind,
  UpMessageType,
  createDownMessage,
  upMessageSchema,
  type AnnounceContent,
  type DownMessage,
  type FeedEntriesContent,
  type UpMessage,
  type UpMessageOfType,
} from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  ChannelClient,
  ChannelDropReason,
  ChannelStatus,
  type ChannelAcceptedEntries,
  type ChannelClientOptions,
  type ChannelDroppedEntries,
  type ChannelWebSocket,
  type ChannelWebSocketHandlers,
} from "./channelClient.js";

const RUNTIME_ID = "0b9f8a52-6d3e-4c55-9b7a-2f1c4d8e6a10";

const ANNOUNCEMENT: AnnounceContent = {
  connectors: [
    {
      id: ConnectorId.LogFile,
      version: CONNECTOR_CATALOG[ConnectorId.LogFile].version,
      capabilities: [
        {
          id: CapabilityId.LogEntries,
          version: LOG_ENTRIES_CAPABILITY.version,
        },
      ],
    },
  ],
  local_access_layer: {
    is_stopped: false,
    capability_rules: [
      {
        capability_id: CapabilityId.LogEntries,
        is_on: true,
        is_filtered: false,
      },
    ],
  },
};

class FakeWebSocket implements ChannelWebSocket {
  readonly sentMessages: UpMessage[] = [];
  isClosed = false;
  /** Answers each heartbeat like a working relay */
  isAcknowledgingHeartbeats = true;

  constructor(readonly handlers: ChannelWebSocketHandlers) {}

  send(data: string) {
    const message = upMessageSchema.parse(JSON.parse(data));
    this.sentMessages.push(message);

    if (
      message.type === UpMessageType.Heartbeat &&
      this.isAcknowledgingHeartbeats
    )
      queueMicrotask(() => this.acknowledge(message));
  }

  close() {
    this.isClosed = true;
  }

  receive(message: DownMessage) {
    this.handlers.onMessage(JSON.stringify(message));
  }

  acknowledge(message: UpMessage, newEntryCount?: number) {
    this.receive(
      createDownMessage(DownMessageType.Acknowledgement, {
        message_id: message.id,
        result: AcknowledgementResult.Accepted,
        new_entry_count: newEntryCount,
      }),
    );
  }

  refuse(message: UpMessage, errorCode: AcknowledgementErrorCode) {
    this.receive(
      createDownMessage(DownMessageType.Acknowledgement, {
        message_id: message.id,
        result: AcknowledgementResult.Refused,
        error_code: errorCode,
      }),
    );
  }

  getSent<Type extends UpMessageType>(type: Type) {
    return this.sentMessages.filter(
      (message): message is UpMessageOfType<Type> => message.type === type,
    );
  }
}

const createLogEntries = (
  entryCount: number,
  firstLineNumber = 1,
): FeedEntriesContent => ({
  capability_id: CapabilityId.LogEntries,
  capability_version: LOG_ENTRIES_CAPABILITY.version,
  connector_id: ConnectorId.LogFile,
  connector_version: CONNECTOR_CATALOG[ConnectorId.LogFile].version,
  entries: Array.from({ length: entryCount }, (_, index) => ({
    type: LogAnalyzerEntryType.JoinPu,
    raw_line: `line ${firstLineNumber + index}`,
    event_at: "2026-11-23T20:00:00.000Z",
    line_number: firstLineNumber + index,
  })),
});

const getLineNumbers = (message: UpMessageOfType<UpMessageType.FeedEntries>) =>
  message.content.entries.map((entry) => entry.line_number);

const setUp = (options: Partial<ChannelClientOptions> = {}) => {
  const sockets: FakeWebSocket[] = [];
  const acceptedEntries: ChannelAcceptedEntries[] = [];
  const droppedEntries: ChannelDroppedEntries[] = [];
  let tokenCount = 0;

  const client = new ChannelClient({
    relayUrl: new URL("wss://relay.example.test/"),
    runtimeId: RUNTIME_ID,
    runtimeKind: RuntimeKind.browser,
    runtimeVersion: "1.0.0",
    announcement: ANNOUNCEMENT,
    getConnectionToken: async () => {
      tokenCount += 1;
      return `token-${tokenCount}`;
    },
    createWebSocket: (_url, handlers) => {
      const socket = new FakeWebSocket(handlers);
      sockets.push(socket);
      return socket;
    },
    // The upper limit of each reconnect delay
    random: () => 1,
    onEntriesAccepted: (entries) => acceptedEntries.push(entries),
    onEntriesDropped: (entries) => droppedEntries.push(entries),
    ...options,
  });

  const getSocket = () => {
    const socket = sockets.at(-1);
    if (socket === undefined) throw new Error("No socket");
    return socket;
  };

  /** Lets the client get the token, and opens the last connection */
  const openSocket = async () => {
    await vi.advanceTimersByTimeAsync(0);

    const socket = getSocket();
    socket.handlers.onOpen();
    return socket;
  };

  /** Answers the handshake and the announcement like the relay */
  const welcome = (socket: FakeWebSocket) => {
    socket.receive(
      createDownMessage(DownMessageType.Welcome, { is_stopped: false }),
    );
    const announcement = socket.getSent(UpMessageType.Announce).at(-1);
    if (announcement === undefined) throw new Error("No announce");
    socket.acknowledge(announcement);
  };

  const connect = async () => {
    client.connect();
    const socket = await openSocket();
    welcome(socket);
    return socket;
  };

  return {
    client,
    sockets,
    acceptedEntries,
    droppedEntries,
    openSocket,
    welcome,
    connect,
  };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("sends the token in the hello, and the announcement after the welcome", async () => {
  const { client, openSocket } = setUp();

  client.connect();
  expect(client.getState().status).toBe(ChannelStatus.Connecting);

  const socket = await openSocket();
  expect(socket.sentMessages).toEqual([
    expect.objectContaining({
      type: UpMessageType.Hello,
      content: {
        token: "token-1",
        runtime_id: RUNTIME_ID,
        runtime_kind: RuntimeKind.browser,
        runtime_version: "1.0.0",
      },
    }),
  ]);

  socket.receive(
    createDownMessage(DownMessageType.Welcome, { is_stopped: false }),
  );

  expect(client.getState()).toMatchObject({
    status: ChannelStatus.Connected,
    closeReason: null,
    isStoppedByOwner: false,
  });
  expect(socket.sentMessages[1]).toMatchObject({
    type: UpMessageType.Announce,
    content: ANNOUNCEMENT,
  });
});

test("a refusal with update_necessary ends the client without a reconnect", async () => {
  const { client, sockets, openSocket } = setUp();

  client.connect();
  const socket = await openSocket();
  socket.receive(
    createDownMessage(DownMessageType.Refusal, {
      reason: RelayCloseReason.UpdateNecessary,
    }),
  );

  expect(client.getState()).toMatchObject({
    status: ChannelStatus.Ended,
    closeReason: RelayCloseReason.UpdateNecessary,
  });
  expect(socket.isClosed).toBe(true);

  await vi.advanceTimersByTimeAsync(10 * 60_000);
  expect(sockets).toHaveLength(1);
});

test("the reason of a close message has priority over the close code of a proxy", async () => {
  const { client, sockets, connect } = setUp();

  const socket = await connect();
  socket.receive(
    createDownMessage(DownMessageType.Close, {
      reason: RelayCloseReason.RelayServiceRestart,
    }),
  );

  expect(client.getState()).toMatchObject({
    status: ChannelStatus.WaitingForReconnect,
    closeReason: RelayCloseReason.RelayServiceRestart,
  });

  // A proxy changed the close code. The code of `update_necessary` would end the client.
  socket.handlers.onClose(RELAY_CLOSE_CODES[RelayCloseReason.UpdateNecessary]);
  expect(client.getState().status).toBe(ChannelStatus.WaitingForReconnect);

  await vi.advanceTimersByTimeAsync(1_000);
  expect(sockets).toHaveLength(2);
});

test("sends the batches without an ack again after a reconnect, each one time", async () => {
  const { client, sockets, acceptedEntries, openSocket, welcome, connect } =
    setUp();

  const firstSocket = await connect();
  client.sendFeedEntries(createLogEntries(150));

  const firstBatches = firstSocket.getSent(UpMessageType.FeedEntries);
  expect(firstBatches.map((batch) => batch.content.entries.length)).toEqual([
    100, 50,
  ]);
  const [firstBatch, secondBatch] = firstBatches;
  if (firstBatch === undefined || secondBatch === undefined)
    throw new Error("Missing batches");

  firstSocket.acknowledge(firstBatch, 100);
  firstSocket.handlers.onClose(1006);

  expect(client.getState()).toMatchObject({
    status: ChannelStatus.WaitingForReconnect,
    closeReason: null,
    queuedEntryCount: 50,
  });

  await vi.advanceTimersByTimeAsync(1_000);
  const secondSocket = await openSocket();
  expect(sockets).toHaveLength(2);
  welcome(secondSocket);

  const resentBatches = secondSocket.getSent(UpMessageType.FeedEntries);
  expect(resentBatches.map(getLineNumbers)).toEqual([
    getLineNumbers(secondBatch),
  ]);

  const [resentBatch] = resentBatches;
  if (resentBatch === undefined) throw new Error("Missing batch");
  secondSocket.acknowledge(resentBatch, 50);
  await vi.advanceTimersByTimeAsync(5_000);

  expect(secondSocket.getSent(UpMessageType.FeedEntries)).toHaveLength(1);
  expect(client.getState().queuedEntryCount).toBe(0);
  expect(acceptedEntries).toEqual([
    {
      capabilityId: CapabilityId.LogEntries,
      entryCount: 100,
      newEntryCount: 100,
    },
    {
      capabilityId: CapabilityId.LogEntries,
      entryCount: 50,
      newEntryCount: 50,
    },
  ]);
});

test("the reconnect delay doubles with each failed attempt up to its maximum", async () => {
  const tokenRequestTimes: number[] = [];
  const { client } = setUp({
    getConnectionToken: async () => {
      tokenRequestTimes.push(Date.now());
      throw new Error("Offline");
    },
  });

  client.connect();
  await vi.advanceTimersByTimeAsync(150_000);

  const delays = tokenRequestTimes
    .slice(1)
    .map((time, index) => time - (tokenRequestTimes[index] ?? 0));
  expect(delays.slice(0, 8)).toEqual([
    1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
  ]);
  expect(client.getState().status).toBe(ChannelStatus.WaitingForReconnect);
});

test("renews the token over the open connection", async () => {
  const { connect } = setUp();

  const socket = await connect();
  await vi.advanceTimersByTimeAsync(60_000);

  const [renewal] = socket.getSent(UpMessageType.TokenRenewal);
  if (renewal === undefined) throw new Error("No renewal");
  expect(renewal.content).toEqual({ token: "token-2" });

  socket.acknowledge(renewal);
  await vi.advanceTimersByTimeAsync(60_000);

  expect(
    socket
      .getSent(UpMessageType.TokenRenewal)
      .map((message) => message.content),
  ).toEqual([{ token: "token-2" }, { token: "token-3" }]);
  expect(socket.isClosed).toBe(false);
});

test("tries a failed renewal again, and reconnects at the end of the grace time", async () => {
  let isTokenAvailable = true;
  let tokenRequestCount = 0;
  const { client, connect } = setUp({
    getConnectionToken: async () => {
      tokenRequestCount += 1;
      if (!isTokenAvailable) throw new Error("Deployment in progress");
      return "token";
    },
  });

  const socket = await connect();
  isTokenAvailable = false;

  // Lifetime of 120 seconds and grace time of 30 seconds. The attempts come
  // at 60, 70, …, 140 seconds.
  await vi.advanceTimersByTimeAsync(149_999);
  expect(socket.isClosed).toBe(false);
  expect(tokenRequestCount).toBe(1 + 9);

  await vi.advanceTimersByTimeAsync(1);
  expect(socket.isClosed).toBe(true);
  expect(client.getState()).toMatchObject({
    status: ChannelStatus.WaitingForReconnect,
    closeReason: RelayCloseReason.TokenNotValid,
  });
});

test("a heartbeat without an ack ends the dead connection and reconnects", async () => {
  const { client, sockets, connect } = setUp();

  const socket = await connect();
  socket.isAcknowledgingHeartbeats = false;

  await vi.advanceTimersByTimeAsync(15_000);
  expect(socket.getSent(UpMessageType.Heartbeat)).toHaveLength(1);
  expect(socket.isClosed).toBe(false);

  await vi.advanceTimersByTimeAsync(15_000);
  expect(socket.isClosed).toBe(true);
  expect(client.getState().status).toBe(ChannelStatus.WaitingForReconnect);

  await vi.advanceTimersByTimeAsync(1_000);
  expect(sockets).toHaveLength(2);
});

test("sends a burst of 4 batches, then one batch each second", async () => {
  const { client, connect } = setUp();

  const socket = await connect();
  client.sendFeedEntries(createLogEntries(600));
  const getBatchCount = () => socket.getSent(UpMessageType.FeedEntries).length;

  expect(getBatchCount()).toBe(4);

  await vi.advanceTimersByTimeAsync(999);
  expect(getBatchCount()).toBe(4);

  await vi.advanceTimersByTimeAsync(1);
  expect(getBatchCount()).toBe(5);

  await vi.advanceTimersByTimeAsync(1_000);
  expect(getBatchCount()).toBe(6);
  expect(client.getState().queuedEntryCount).toBe(600);
});

test("removes the entries of a part that the switches turn off", async () => {
  const { client, droppedEntries, connect } = setUp();

  const socket = await connect();
  client.sendFeedEntries(createLogEntries(600));
  expect(socket.getSent(UpMessageType.FeedEntries)).toHaveLength(4);

  socket.receive(
    createDownMessage(DownMessageType.Switches, {
      turned_off_connectors: [],
      turned_off_capabilities: [CapabilityId.LogEntries],
    }),
  );
  client.sendFeedEntries(createLogEntries(10, 601));

  expect(client.getState().turnedOffCapabilityIds).toEqual([
    CapabilityId.LogEntries,
  ]);
  expect(droppedEntries).toEqual([
    {
      capabilityId: CapabilityId.LogEntries,
      entryCount: 100,
      reason: ChannelDropReason.TurnedOff,
    },
    {
      capabilityId: CapabilityId.LogEntries,
      entryCount: 100,
      reason: ChannelDropReason.TurnedOff,
    },
    {
      capabilityId: CapabilityId.LogEntries,
      entryCount: 10,
      reason: ChannelDropReason.TurnedOff,
    },
  ]);

  await vi.advanceTimersByTimeAsync(5_000);
  expect(socket.getSent(UpMessageType.FeedEntries)).toHaveLength(4);

  socket.receive(
    createDownMessage(DownMessageType.Switches, {
      turned_off_connectors: [],
      turned_off_capabilities: [],
    }),
  );
  client.sendFeedEntries(createLogEntries(10, 611));

  const lastBatch = socket.getSent(UpMessageType.FeedEntries).at(-1);
  expect(lastBatch && getLineNumbers(lastBatch)[0]).toBe(611);
});

test("stop of the owner removes the waiting entries until the start", async () => {
  const { client, droppedEntries, connect } = setUp();

  const socket = await connect();
  client.sendFeedEntries(createLogEntries(500));
  const sentBatches = socket.getSent(UpMessageType.FeedEntries);
  expect(sentBatches).toHaveLength(4);

  socket.receive(createDownMessage(DownMessageType.Stop, {}));
  expect(client.getState().isStoppedByOwner).toBe(true);

  // The relay refuses a batch that it received after the stop
  const lastSentBatch = sentBatches.at(-1);
  if (lastSentBatch === undefined) throw new Error("No batch");
  socket.refuse(lastSentBatch, AcknowledgementErrorCode.Stopped);
  client.sendFeedEntries(createLogEntries(10, 501));

  expect(droppedEntries).toEqual(
    [100, 100, 10].map((entryCount) => ({
      capabilityId: CapabilityId.LogEntries,
      entryCount,
      reason: ChannelDropReason.StoppedByOwner,
    })),
  );
  expect(client.getState().queuedEntryCount).toBe(300);

  socket.receive(createDownMessage(DownMessageType.Start, {}));
  await vi.advanceTimersByTimeAsync(1_000);
  client.sendFeedEntries(createLogEntries(10, 511));

  expect(client.getState().isStoppedByOwner).toBe(false);
  const lastBatch = socket.getSent(UpMessageType.FeedEntries).at(-1);
  expect(lastBatch && getLineNumbers(lastBatch)[0]).toBe(511);
});
