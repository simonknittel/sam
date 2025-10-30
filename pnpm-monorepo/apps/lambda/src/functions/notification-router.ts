import type { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import { log } from "../common/logger";
import { initializeRequestContext } from "../common/requestContext";
import {
  isRequestProcessed,
  setRequestProcessed,
} from "./notification-router/dynamodb";
import {
  bodySchema,
  notificationRouterHandler,
} from "./notification-router/handler";

export const handler: SQSHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
    const batchItemFailures: SQSBatchItemFailure[] = [];

    for (const record of event.Records) {
      try {
        const body = bodySchema.parse(JSON.parse(record.body));

        if (await isRequestProcessed(body.requestId)) continue;

        await notificationRouterHandler(body);

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
