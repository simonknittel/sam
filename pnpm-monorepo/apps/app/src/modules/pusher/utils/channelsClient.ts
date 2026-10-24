import { env } from "@/env";
import type { RealtimeServer } from "@sam-monorepo/application";
import * as Pusher from "pusher";
import * as z from "zod";

/**
 * The maximum time of one request to the HTTP API of the realtime server. A
 * ban waits for the termination of the connections of the user.
 */
const REQUEST_TIMEOUT_MILLISECONDS = 5_000;

/**
 * Soketi answers a refused request also with the status 200, but with an
 * error in the body. Only this body confirms the termination.
 */
const terminateUserConnectionsResponseSchema = z.object({
  ok: z.literal(true),
});

export let channelsClient: Pusher | null = null;

if (
  env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY &&
  env.PUSHER_CHANNELS_APP_SECRET &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT
) {
  channelsClient = new Pusher.default({
    appId: env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID,
    key: env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY,
    secret: env.PUSHER_CHANNELS_APP_SECRET,
    host: env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
    port: env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT
      ? env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT.toFixed()
      : env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT.toFixed(),
    useTLS: Boolean(env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT),
    timeout: REQUEST_TIMEOUT_MILLISECONDS,
  });
}

/**
 * The realtime port of the application context. The tabs sign in with the
 * id of their user (see the route `/api/pusher/user-auth`).
 */
export const createChannelsRealtimeServer = (
  client: Pusher,
): RealtimeServer => ({
  terminateUserConnections: async (userId) => {
    const response = await client.terminateUserConnections(userId);
    const body: unknown = await response.json();

    if (!terminateUserConnectionsResponseSchema.safeParse(body).success)
      throw new Error(
        "The realtime server did not confirm the termination of the user connections",
      );
  },
});
