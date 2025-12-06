"use client";

import { env } from "@/env";
import type { User } from "@prisma/client";
import Pusher from "pusher-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface ChannelsContext {
  client: Pusher | null;
}

const ChannelsContext = createContext<ChannelsContext | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly userId: User["id"];
}

export const ChannelsProvider = ({ children, userId }: Props) => {
  const [client, setClient] = useState<Pusher | null>(null);

  useEffect(() => {
    if (!client) {
      if (
        !env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID ||
        !env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY
      ) {
        console.info(
          "[Pusher] Channels client not initialized, missing environment variables.",
        );
        return;
      }

      const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY, {
        cluster: "eu",
        wsHost: env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
        wsPort: env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
        wssPort: env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT,
        httpHost: env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
        httpPort: env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
        httpsPort: env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT,
        forceTLS: env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT ? true : false,
        userAuthentication: {
          endpoint: "/api/pusher/user-auth",
          transport: "ajax",
        },
        channelAuthorization: {
          endpoint: "/api/pusher/channel-auth",
          transport: "ajax",
        },
      });
      console.info("[Pusher] Channels client initialized.");

      setClient(pusher);

      pusher.signin();
    }

    return () => {
      if (client) {
        client.disconnect();
        setClient(null);
        console.info("[Pusher] Channels client disconnected.");
      }
    };
  }, [userId, client]);

  const value = useMemo(() => ({ client }), [client]);

  return (
    <ChannelsContext.Provider value={value}>
      {children}
    </ChannelsContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useChannelsContext() {
  const context = useContext(ChannelsContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
