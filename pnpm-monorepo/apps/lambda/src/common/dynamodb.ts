import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

/** The table and its TTL attribute `ExpiresAt` are in `terraform/dynamodb.tf` */
export const dynamoDB = new DynamoDBClient({});

export const isRequestProcessed = async (requestId: string) => {
  const getCommand = new GetItemCommand({
    TableName: "SqsProcessedRequests",
    Key: {
      RequestId: { S: requestId },
    },
  });

  const response = await dynamoDB.send(getCommand);

  return Boolean(response.Item);
};

export const setRequestProcessed = async (requestId: string) => {
  const putCommand = new PutItemCommand({
    TableName: "SqsProcessedRequests",
    Item: {
      RequestId: { S: requestId },
      ExpiresAt: { N: (Date.now() / 1000 + 60 * 60 * 24 * 31).toString() },
    },
  });

  await dynamoDB.send(putCommand);
};
