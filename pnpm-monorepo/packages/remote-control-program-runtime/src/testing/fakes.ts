import {
  AcknowledgementResult,
  DownMessageType,
  UpMessageType,
  createDownMessage,
  upMessageSchema,
  type AcknowledgementErrorCode,
  type DownMessage,
  type UpMessage,
  type UpMessageOfType,
} from "@sam-monorepo/domain";
import type {
  ChannelTimers,
  ChannelWebSocket,
  ChannelWebSocketHandlers,
} from "../channel/channelTypes.js";
import type { LocalAccessStorage } from "../localAccess/localAccessStorage.js";

/** The fakes of the tests of the package. The build leaves them out. */

/** The clock of the fake timers of Vitest, for the runtime and the channel */
export const FAKE_TIMERS: ChannelTimers = {
  now: () => Date.now(),
  schedule: (callback, delayMilliseconds) => {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
  },
};

/** `localStorage` of one browser profile */
export const createMemoryStorage = (
  initialValues: Record<string, string> = {},
) => {
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
  } satisfies LocalAccessStorage & { values: Map<string, string> };
};

/** The WebSocket of the channel client, with the answers of the relay */
export class FakeWebSocket implements ChannelWebSocket {
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

  getSentRawLines() {
    return this.getSent(UpMessageType.FeedEntries).flatMap((message) =>
      message.content.entries.map((entry) => entry.raw_line),
    );
  }
}
