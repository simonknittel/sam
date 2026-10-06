import {
  captureAsyncFunc as _captureAsyncFunc,
  setContextMissingStrategy,
} from "aws-xray-sdk-core";

setContextMissingStrategy(
  process.env.ENVIRONMENT === "local"
    ? /** Locally, no X-Ray daemon runs: ignore the missing context */
      () => {}
    : "LOG_ERROR",
);

export * from "aws-xray-sdk-core";

// @ts-expect-error
export const captureAsyncFunc: typeof _captureAsyncFunc = (name, callback) => {
  return _captureAsyncFunc(name, async (subsegment) => {
    try {
      const result = await callback();

      subsegment?.close();
      subsegment?.flush();

      return result;
    } catch (error) {
      // @ts-expect-error
      subsegment?.close(error);
      subsegment?.flush();

      throw error;
    }
  });
};
