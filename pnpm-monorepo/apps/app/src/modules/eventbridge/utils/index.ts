import { env } from "@/env";
import { log } from "@/modules/logging";
import { CustomError } from "@/modules/logging/CustomError";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";

const client =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_EVENT_BUS_ARN
    ? new EventBridgeClient({
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
        region: "eu-central-1",
      })
    : null;

/** PutEvents accepts at most 10 entries per call */
const BATCH_SIZE = 10;

export const emitEvents = withTrace(
  "emitEvents",
  async (
    entries: Omit<
      NonNullable<PutEventsCommandInput["Entries"]>[number],
      "EventBusName"
    >[],
  ) => {
    if (!client) {
      log.info(
        "Missing environment variables for AWS. EventBridge client has not been initialized. Skipping sending events.",
      );
      return;
    }

    if (entries.length <= 0) {
      log.info("No entries provided to send to EventBridge.");
      return;
    }

    for (let index = 0; index < entries.length; index += BATCH_SIZE) {
      const input: PutEventsCommandInput = {
        Entries: entries.slice(index, index + BATCH_SIZE).map((entry) => ({
          ...entry,
          EventBusName: env.AWS_EVENT_BUS_ARN!,
        })),
      };

      const command = new PutEventsCommand(input);
      const response = await client.send(command);

      if (response.FailedEntryCount) {
        throw new CustomError("Failed to send events to EventBridge", {
          response,
        });
      }
    }
  },
);
