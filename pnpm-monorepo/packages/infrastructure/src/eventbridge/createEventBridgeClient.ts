import { EventBridgeClient } from "@aws-sdk/client-eventbridge";

const REGION = "eu-central-1";

const CONNECTION_TIMEOUT_MILLISECONDS = 3_000;

const REQUEST_TIMEOUT_MILLISECONDS = 10_000;

export interface EventBridgeClientOptions {
  /**
   * Without them, the SDK uses the credentials of the runtime, for example the
   * role of a Lambda function
   */
  readonly credentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
}

export const createEventBridgeClient = ({
  credentials,
}: EventBridgeClientOptions = {}): EventBridgeClient =>
  new EventBridgeClient({
    region: REGION,
    credentials,
    requestHandler: {
      connectionTimeout: CONNECTION_TIMEOUT_MILLISECONDS,
      requestTimeout: REQUEST_TIMEOUT_MILLISECONDS,
      // Without this option, the SDK only logs a warning when the request
      // timeout is over, and the request continues
      throwOnRequestTimeout: true,
    },
  });
