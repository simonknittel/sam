import type {
  CitizenRealtimeEvent,
  RealtimeServer,
} from "@sam-monorepo/application";
import { getCitizenRealtimeChannelName } from "@sam-monorepo/domain";
import * as z from "zod";
import type { PusherClient } from "./createPusherClient.js";

/**
 * The maximum number of events in one batch request of the HTTP API of
 * Pusher Channels. Soketi has the same default limit.
 */
const MAXIMUM_BATCH_EVENTS = 10;

/**
 * Soketi answers a refused request also with the status 200, but with an
 * error in the body. Only this body confirms the termination.
 */
const terminateUserConnectionsResponseSchema = z.object({
  ok: z.literal(true),
});

export interface PusherRealtimeServerOptions {
  /** See `createPusherClient()`. Its timeout limits each request. */
  readonly client: PusherClient;
}

const toBatches = <Item>(items: readonly Item[]): Item[][] => {
  const batches: Item[][] = [];
  for (let start = 0; start < items.length; start += MAXIMUM_BATCH_EVENTS)
    batches.push(items.slice(start, start + MAXIMUM_BATCH_EVENTS));

  return batches;
};

/**
 * The realtime port with the HTTP API of Pusher Channels or Soketi. The
 * tabs of the app sign in with the id of their user (see the route
 * `/api/pusher/user-auth` of the app), and subscribe to the private channels
 * of their citizen (see `CitizenRealtimeChannel` of the domain).
 */
export const createPusherRealtimeServer = ({
  client,
}: PusherRealtimeServerOptions): RealtimeServer => ({
  terminateUserConnections: async (userId) => {
    const response = await client.terminateUserConnections(userId);
    const body: unknown = await response.json();

    if (!terminateUserConnectionsResponseSchema.safeParse(body).success)
      throw new Error(
        "The realtime server did not confirm the termination of the user connections",
      );
  },

  publishToCitizens: async (events: readonly CitizenRealtimeEvent[]) => {
    const batches = toBatches(
      events.map((event) => ({
        channel: getCitizenRealtimeChannelName(event.channel, event.citizenId),
        name: event.name,
        data: JSON.stringify(event.data),
      })),
    );

    // The client throws a `RequestError` for a status other than 2xx
    const results = await Promise.allSettled(
      batches.map((batch) => client.triggerBatch(batch)),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0)
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        `The realtime server refused ${failures.length} of ${batches.length} batches of events`,
      );
  },
});
