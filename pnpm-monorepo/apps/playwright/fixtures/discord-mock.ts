import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A stand-in for Discord's REST API, one per Playwright worker. The app is
 * pointed at it with DISCORD_API_BASE_URL, so publishing exercises the real
 * request path without a guild, a bot token or network access.
 */

/** Guild voice channel — the app offers these in the channel picker */
export const MOCK_VOICE_CHANNEL = {
  id: "900000000000000001",
  name: "Einsatzraum",
  type: 2,
  position: 1,
};

/** Guild stage channel — also offered, with a different Discord entity type */
export const MOCK_STAGE_CHANNEL = {
  id: "900000000000000002",
  name: "Bühne",
  type: 13,
  position: 2,
};

/** Text channel — must never show up in the picker */
export const MOCK_TEXT_CHANNEL = {
  id: "900000000000000003",
  name: "allgemein",
  type: 0,
  position: 0,
};

export interface MockDiscordRequest {
  readonly method: string;
  readonly path: string;
  readonly body: Record<string, unknown> | null;
}

export interface DiscordMock {
  /** Value for the app's DISCORD_API_BASE_URL */
  readonly baseUrl: string;
  /** The guild scheduled events that currently exist, by Discord id */
  readonly scheduledEvents: Map<string, Record<string, unknown>>;
  /** Every request the app made, oldest first */
  readonly requests: MockDiscordRequest[];
  /**
   * Deletes an event behind the app's back, the way a guild admin would —
   * the app's next call then gets a 404 and clears its publish state.
   */
  readonly forgetScheduledEvent: (scheduledEventId: string) => void;
  readonly reset: () => void;
  readonly close: () => Promise<void>;
}

const readJsonBody = async (
  request: IncomingMessage,
): Promise<Record<string, unknown> | null> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return null;

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
};

export const startDiscordMock = async (): Promise<DiscordMock> => {
  const scheduledEvents = new Map<string, Record<string, unknown>>();
  const requests: MockDiscordRequest[] = [];
  let nextEventId = 1;

  const server: Server = createServer((request, response) => {
    void (async () => {
      const path = (request.url ?? "").split("?")[0] ?? "";
      const body = await readJsonBody(request);
      requests.push({ method: request.method ?? "", path, body });

      const respond = (status: number, payload?: unknown) => {
        if (payload === undefined) {
          response.writeHead(status);
          response.end();
          return;
        }
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(payload));
      };

      if (request.method === "GET" && path.endsWith("/channels")) {
        respond(200, [
          MOCK_TEXT_CHANNEL,
          MOCK_STAGE_CHANNEL,
          MOCK_VOICE_CHANNEL,
        ]);
        return;
      }

      const scheduledEventsMatch = /\/scheduled-events(?:\/([^/]+))?$/.exec(
        path,
      );
      if (!scheduledEventsMatch) {
        respond(404, { message: "Unknown route" });
        return;
      }
      const scheduledEventId = scheduledEventsMatch[1];

      if (request.method === "POST" && !scheduledEventId) {
        const id = `mock-scheduled-event-${nextEventId++}`;
        scheduledEvents.set(id, { ...body, id });
        respond(200, { ...body, id });
        return;
      }

      if (!scheduledEventId || !scheduledEvents.has(scheduledEventId)) {
        respond(404, { code: 10070, message: "Unknown Guild Scheduled Event" });
        return;
      }

      if (request.method === "PATCH") {
        scheduledEvents.set(scheduledEventId, {
          ...scheduledEvents.get(scheduledEventId),
          ...body,
        });
        respond(200, scheduledEvents.get(scheduledEventId));
        return;
      }

      if (request.method === "DELETE") {
        scheduledEvents.delete(scheduledEventId);
        respond(204);
        return;
      }

      respond(405, { message: "Method not allowed" });
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/api/v10`,
    scheduledEvents,
    requests,
    forgetScheduledEvent: (id) => scheduledEvents.delete(id),
    reset: () => {
      scheduledEvents.clear();
      requests.length = 0;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
