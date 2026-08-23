import { WebPushError } from "web-push";

/**
 * A `WebPushError` carries the subscription `endpoint`, the response `headers`
 * and the response `body`. The endpoint is a per-device bearer URL, so logging
 * the raw error would leak it. This keeps only the fields that are safe to log
 * and returns any other error unchanged for the logger to serialize.
 */
export const toLoggableWebPushError = (error: unknown) =>
  error instanceof WebPushError
    ? { name: error.name, message: error.message, statusCode: error.statusCode }
    : error;
