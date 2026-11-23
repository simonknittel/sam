import { env } from "@/env";
import {
  createPusherClient,
  type PusherClient,
} from "@sam-monorepo/infrastructure";

/** A ban waits for the termination of the connections of the user */
const REQUEST_TIMEOUT_MILLISECONDS = 5_000;

export let channelsClient: PusherClient | null = null;

if (
  env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY &&
  env.PUSHER_CHANNELS_APP_SECRET &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST &&
  env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT
) {
  channelsClient = createPusherClient({
    appId: env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID,
    key: env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY,
    secret: env.PUSHER_CHANNELS_APP_SECRET,
    host: env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
    port:
      env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT ||
      env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
    useTls: Boolean(env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT),
    timeoutMilliseconds: REQUEST_TIMEOUT_MILLISECONDS,
  });
}
