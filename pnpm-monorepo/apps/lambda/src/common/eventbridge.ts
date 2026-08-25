import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";
import { log } from "./logger";
import { captureAsyncFunc } from "./xray";

const client = new EventBridgeClient({
  region: "eu-central-1",
});

/** PutEvents accepts at most 10 entries per call */
const BATCH_SIZE = 10;

/**
 * Sends the entries to the event bus. Callers pass as many entries as they
 * have; the AWS limit of ten entries per call is handled here, so that it
 * does not leak into every automation.
 */
export const emitEvents = async (
  entries: Omit<
    NonNullable<PutEventsCommandInput["Entries"]>[number],
    "EventBusName"
  >[],
) => {
  await captureAsyncFunc("emitEvents", async () => {
    if (!process.env.AWS_EVENT_BUS_ARN) {
      void log.info("Event bus ARN not configured, skipping emitting events.");
      return;
    }

    if (entries.length <= 0) {
      void log.info("No entries provided to send to EventBridge.");
      return;
    }

    for (let index = 0; index < entries.length; index += BATCH_SIZE) {
      const input: PutEventsCommandInput = {
        Entries: entries.slice(index, index + BATCH_SIZE).map((entry) => ({
          ...entry,
          EventBusName: process.env.AWS_EVENT_BUS_ARN,
        })),
      };

      const command = new PutEventsCommand(input);
      const response = await client.send(command);

      if (response.FailedEntryCount) {
        void log.error("Failed to send events to EventBridge", {
          response,
        });
      }
    }
  });
};
