import type { RelayService } from "../src/context.js";

interface TestRelayServiceOptions {
  /** Each request fails like a relay service that cannot be reached */
  readonly fails?: boolean;
}

/** It records the disconnected users in the sequence of the calls */
export const createTestRelayService = ({
  fails = false,
}: TestRelayServiceOptions = {}) => {
  const disconnectedUserIds: string[] = [];

  const relay: RelayService = {
    webSocketUrl: new URL("wss://relay.example.com"),
    disconnectUser: async (userId) => {
      if (fails) throw new Error("The test relay service cannot be reached");

      disconnectedUserIds.push(userId);
    },
  };

  return { relay, disconnectedUserIds };
};
