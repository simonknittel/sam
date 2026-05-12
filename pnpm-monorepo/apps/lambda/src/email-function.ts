import "./email-function/setup";

import type { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import z from "zod";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";
import {
  isRequestProcessed,
  setRequestProcessed,
} from "./email-function/dynamodb";
import { emailFunctionHandler } from "./email-function/handler";

export const handler: SQSHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    const batchItemFailures: SQSBatchItemFailure[] = [];

    log.info("Processing SQS messages", {
      count: event.Records.length,
    });
    for (const record of event.Records) {
      try {
        const body = requestBodySchema.parse(JSON.parse(record.body || ""));

        if (await isRequestProcessed(body.requestId)) {
          log.info("Request already processed", {
            requestId: body.requestId,
          });

          continue;
        }

        await emailFunctionHandler(body);

        await setRequestProcessed(body.requestId);
      } catch (error) {
        log.error("An error occurred while processing an SQS message", {
          error,
          messageId: record.messageId,
        });

        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  });
};

export const requestBodySchema = z.object({
  template: z.enum(["emailConfirmation"]),
  messages: z.array(
    z.object({
      to: z.email(),
      templateProps: z.record(z.string(), z.string()),
      recipientsPublicKey: z.string().optional(),
    }),
  ),
  requestId: z.cuid2(),
});
