import {
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SQSBatchItemFailure, SQSHandler } from "aws-lambda";
import { serializeError } from "serialize-error";
import z from "zod";
import { fetchParameters } from "./_lib/fetchParameters";
import { log } from "./_lib/logging";
import { main } from "./_lib/main";

const client = new DynamoDBClient({});

export const handler: SQSHandler = async (event) => {
	// https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
	const batchItemFailures: SQSBatchItemFailure[] = [];

	for (const record of event.Records) {
		try {
			const body = JSON.parse(record.body || "");
			const requestBody = requestBodySchema.parse(body);

			if (await isRequestProcessed(requestBody.requestId)) {
				log.info("Request already processed", {
					requestId: requestBody.requestId,
				});

				continue;
			}

			const parameters = await fetchParameters({
				mailgunApiKey: "/mailgun/api_key",
			});

			await main({
				...parameters,
				...requestBody,
			});

			setRequestProcessed(requestBody.requestId);
		} catch (error) {
			log.error("errorHandler", {
				error: serializeError(error),
				messageId: record.messageId,
			});

			batchItemFailures.push({ itemIdentifier: record.messageId });
		}
	}

	return { batchItemFailures };
};

const requestBodySchema = z.object({
	requestId: z.string().cuid2(),
	template: z.string(),
	messages: z.array(
		z.object({
			to: z.string().email(),
			templateProps: z.record(z.string(), z.string()),
			recipientsPublicKey: z.string().optional(),
		}),
	),
});

const isRequestProcessed = async (requestId: string) => {
	const getCommand = new GetItemCommand({
		TableName: "SqsProcessedRequests",
		Key: {
			RequestId: { S: requestId },
		},
	});

	const response = await client.send(getCommand);

	return Boolean(response.Item);
};

const setRequestProcessed = async (requestId: string) => {
	const putCommand = new PutItemCommand({
		TableName: "SqsProcessedRequests",
		Item: {
			RequestId: { S: requestId },
			ExpiresAt: { N: (Date.now() / 1000 + 60 * 60 * 24 * 31).toString() },
		},
	});

	await client.send(putCommand);
};
