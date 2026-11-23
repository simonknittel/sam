import type { RelayService } from "../src/context.js";

interface TestRelayServiceOptions {
  /** Each request fails like a relay service that cannot be reached */
  readonly fails?: boolean;
}

/**
 * The relay service of the tests. It records the disconnected users and the
 * owners whose stop changed, in the sequence of the calls.
 */
export const createTestRelayService = ({
  fails = false,
}: TestRelayServiceOptions = {}) => {
  const disconnectedUserIds: string[] = [];
  const ownerStopChangeCitizenIds: string[] = [];

  const relay: RelayService = {
    webSocketUrl: new URL("wss://relay.example.com"),
    disconnectUser: async (userId) => {
      if (fails) throw new Error("The test relay service cannot be reached");

      disconnectedUserIds.push(userId);
    },
    notifyOwnerStopChanged: async (ownerCitizenId) => {
      if (fails) throw new Error("The test relay service cannot be reached");

      ownerStopChangeCitizenIds.push(ownerCitizenId);
    },
  };

  return { relay, disconnectedUserIds, ownerStopChangeCitizenIds };
};
