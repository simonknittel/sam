import { env } from "@/env";
import { CustomError } from "@/modules/logging/CustomError";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  EventBridgeClient,
  PutEventsCommand,
  type PutEventsCommandInput,
} from "@aws-sdk/client-eventbridge";
import { createId } from "@paralleldrive/cuid2";

export const sendEmail = withTrace(
  "sendEmail",
  async (
    template: "emailConfirmation",
    messages: {
      to: string;
      templateProps: Record<string, string>;
    }[],
  ) => {
    if (
      !env.AWS_ACCESS_KEY_ID ||
      !env.AWS_SECRET_ACCESS_KEY ||
      !env.AWS_EVENT_BUS_ARN
    )
      throw new Error(
        "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY or EVENT_BUS_ARN are missing",
      );

    try {
      // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/eventbridge/
      const client = new EventBridgeClient({
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
        region: "eu-central-1",
      });

      const input: PutEventsCommandInput = {
        Entries: [
          {
            Source: "App",
            DetailType: "EmailRequested",
            Detail: JSON.stringify({
              requestId: createId(),
              template,
              messages,
            }),
            EventBusName: env.AWS_EVENT_BUS_ARN,
          },
        ],
      };

      const command = new PutEventsCommand(input);

      const response = await client.send(command);

      if (response.FailedEntryCount) {
        throw new CustomError(
          "Failed to create EmailConfirmationRequested event",
          {
            response,
          },
        );
      }
    } catch (error) {
      throw new CustomError(
        "Failed to create EmailConfirmationRequested event",
        {
          error,
        },
      );
    }
  },
);
