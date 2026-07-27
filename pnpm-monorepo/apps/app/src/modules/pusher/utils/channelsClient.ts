import { env } from "@/env";
import * as Pusher from "pusher";

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
  });
}
