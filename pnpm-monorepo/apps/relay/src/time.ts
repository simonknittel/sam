export const MILLISECONDS_PER_SECOND = 1_000;

export const ONE_MINUTE_MILLISECONDS = 60 * MILLISECONDS_PER_SECOND;

export const ONE_HOUR_MILLISECONDS = 60 * ONE_MINUTE_MILLISECONDS;

/**
 * Gives the value of the promise, or the fallback when the promise does not
 * settle within the time. A rejection of the promise goes to the caller.
 */
export const resolveWithin = async <Value>(
  promise: Promise<Value>,
  timeoutMilliseconds: number,
  fallback: Value,
): Promise<Value> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<Value>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMilliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};
