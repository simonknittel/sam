import { WebPushError } from "web-push";

/**
 * A `WebPushError` carries the subscription `endpoint`, a per-device bearer
 * URL, so logging the raw error would leak it
 */
export const toLoggableWebPushError = (error: unknown) =>
  error instanceof WebPushError
    ? { name: error.name, message: error.message, statusCode: error.statusCode }
    : error;
