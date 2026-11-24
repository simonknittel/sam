import {
  DiscordOutcome,
  type DiscordGateway,
  type DiscordResult,
  type DiscordScheduledEvent,
} from "../src/context.js";

interface TestDiscordGatewayOptions {
  readonly scheduledEvents?: readonly DiscordScheduledEvent[];
  /** A scheduled event without an entry has no users */
  readonly userIdsByScheduledEventId?: Readonly<
    Record<string, readonly string[]>
  >;
  readonly failsUserListFor?: readonly string[];
}

const FAILED = { outcome: DiscordOutcome.Failed } as const;

const succeed = <Data>(data: Data): DiscordResult<Data> => ({
  outcome: DiscordOutcome.Success,
  data,
});

export const createTestDiscordGateway = ({
  scheduledEvents = [],
  userIdsByScheduledEventId = {},
  failsUserListFor = [],
}: TestDiscordGatewayOptions = {}): DiscordGateway & {
  readonly calls: (keyof DiscordGateway)[];
} => {
  const calls: (keyof DiscordGateway)[] = [];

  const record = (operation: keyof DiscordGateway) => {
    calls.push(operation);
  };

  return {
    calls,
    listScheduledEvents: async () => {
      record("listScheduledEvents");
      return succeed([...scheduledEvents]);
    },
    listScheduledEventUserIds: async (scheduledEventId) => {
      record("listScheduledEventUserIds");
      if (failsUserListFor.includes(scheduledEventId)) return FAILED;

      return succeed([...(userIdsByScheduledEventId[scheduledEventId] ?? [])]);
    },
    listChannels: async () => {
      record("listChannels");
      return FAILED;
    },
    createScheduledEvent: async () => {
      record("createScheduledEvent");
      return FAILED;
    },
    modifyScheduledEvent: async () => {
      record("modifyScheduledEvent");
      return FAILED;
    },
    deleteScheduledEvent: async () => {
      record("deleteScheduledEvent");
      return FAILED;
    },
  };
};
