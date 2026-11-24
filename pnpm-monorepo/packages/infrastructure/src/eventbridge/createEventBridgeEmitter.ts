import {
  PutEventsCommand,
  type PutEventsCommandOutput,
  type PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import type { Logger } from "@sam-monorepo/application";

/** `PutEvents` accepts at most ten entries per call */
const BATCH_SIZE = 10;

export type EventBridgeEntry = Omit<PutEventsRequestEntry, "EventBusName">;

export type EmitEvents = (entries: EventBridgeEntry[]) => Promise<void>;

export interface EventBridgeEmitterOptions {
  /** Null when the host has no credentials */
  readonly client: {
    readonly send: (
      command: PutEventsCommand,
    ) => Promise<PutEventsCommandOutput>;
  } | null;
  readonly eventBusArn: string | null | undefined;
  readonly log: Logger;
}

export class EventBridgeFailedEntriesError extends Error {
  override readonly name = "EventBridgeFailedEntriesError";

  constructor(failedResponses: PutEventsCommandOutput[]) {
    super("Failed to send events to EventBridge", { cause: failedResponses });
  }
}

/**
 * Without a client or an event bus, EventBridge is not configured (for example
 * in local development): then the emitter sends nothing.
 *
 * @throws EventBridgeFailedEntriesError when EventBridge does not take an
 * entry. The emitter throws after it sent all batches.
 */
export const createEventBridgeEmitter =
  ({ client, eventBusArn, log }: EventBridgeEmitterOptions): EmitEvents =>
  async (entries) => {
    if (!client || !eventBusArn) {
      log.info("EventBridge is not configured. The events are not sent.");
      return;
    }

    const failedResponses: PutEventsCommandOutput[] = [];

    for (let index = 0; index < entries.length; index += BATCH_SIZE) {
      const response = await client.send(
        new PutEventsCommand({
          Entries: entries
            .slice(index, index + BATCH_SIZE)
            .map((entry) => ({ ...entry, EventBusName: eventBusArn })),
        }),
      );

      if (response.FailedEntryCount) failedResponses.push(response);
    }

    if (failedResponses.length > 0)
      throw new EventBridgeFailedEntriesError(failedResponses);
  };
