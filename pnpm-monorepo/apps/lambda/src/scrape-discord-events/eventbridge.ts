import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

const client = new EventBridgeClient({
  region: "eu-central-1",
});

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

    const input: PutEventsCommandInput = {
      Entries: entries.map((entry) => ({
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
  });
};
