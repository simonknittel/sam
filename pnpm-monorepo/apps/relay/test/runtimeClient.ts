import {
  createUpMessage,
  DownMessageType,
  parseDownMessage,
  RuntimeKind,
  UpMessageType,
  type DownMessage,
  type DownMessageOfType,
  type UpMessage,
} from "@sam-monorepo/domain";
import { once } from "node:events";
import { WebSocket } from "ws";

/** The maximum time of a test for one expected message or close */
const WAIT_TIMEOUT_MILLISECONDS = 5_000;

export interface ClosedConnection {
  readonly code: number;
}

/**
 * A runtime of the tests: a real WebSocket client that keeps all messages
 * of the relay service
 */
export class TestRuntimeClient {
  readonly #socket: WebSocket;
  readonly #messages: DownMessage[] = [];
  readonly #listeners = new Set<() => void>();
  readonly closed: Promise<ClosedConnection>;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    this.closed = new Promise((resolve) => {
      socket.once("close", (code) => resolve({ code }));
    });
    socket.on("message", (data) => {
      const result = parseDownMessage(String(data));
      if (!result.success)
        throw new Error(`The relay sent a message that is not valid: ${data}`);

      this.#messages.push(result.message);
      for (const listener of this.#listeners) listener();
    });
  }

  static async open(url: string, headers: Record<string, string> = {}) {
    const socket = new WebSocket(url, { headers });
    const client = new TestRuntimeClient(socket);
    await once(socket, "open");
    return client;
  }

  /** Sends a message, or a text that is not a valid message */
  send(message: UpMessage | string) {
    this.#socket.send(
      typeof message === "string" ? message : JSON.stringify(message),
    );
    return message;
  }

  sendHello(token: string, runtimeId: string) {
    return this.send(
      createUpMessage(UpMessageType.Hello, {
        token,
        runtime_id: runtimeId,
        runtime_kind: RuntimeKind.Browser,
        runtime_version: "1.0.0",
      }),
    );
  }

  /** The first message of the type, also when it arrived before the call */
  async waitForMessage<Type extends DownMessageType>(
    type: Type,
    isMatch: (message: DownMessageOfType<Type>) => boolean = () => true,
  ): Promise<DownMessageOfType<Type>> {
    const find = () =>
      this.#messages.find(
        (message): message is DownMessageOfType<Type> =>
          message.type === type && isMatch(message as DownMessageOfType<Type>),
      );

    const found = find();
    if (found) return found;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#listeners.delete(listener);
        reject(
          new Error(
            `No ${type} message arrived. Messages: ${JSON.stringify(this.#messages)}`,
          ),
        );
      }, WAIT_TIMEOUT_MILLISECONDS);
      const listener = () => {
        const message = find();
        if (!message) return;

        clearTimeout(timeout);
        this.#listeners.delete(listener);
        resolve(message);
      };
      this.#listeners.add(listener);
    });
  }

  /** The `ack` of the message */
  waitForAcknowledgement(message: UpMessage | { readonly id: string }) {
    return this.waitForMessage(
      DownMessageType.Acknowledgement,
      (acknowledgement) => acknowledgement.content.message_id === message.id,
    );
  }

  /** Sends the message and waits for its `ack` */
  async request(message: UpMessage) {
    this.send(message);
    return (await this.waitForAcknowledgement(message)).content;
  }

  getMessages(type: DownMessageType) {
    return this.#messages.filter((message) => message.type === type);
  }

  async waitForClose() {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.closed,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error("The relay did not close the connection")),
            WAIT_TIMEOUT_MILLISECONDS,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  async close() {
    if (this.#socket.readyState !== WebSocket.CLOSED) {
      this.#socket.close();
      await this.closed;
    }
  }
}
