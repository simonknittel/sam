import { CHANNEL_CLIENT_LIMITS } from "./channelLimits.js";

/**
 * The delay before the next connection attempt: exponential backoff with
 * "equal jitter". The upper limit doubles with each failed attempt in
 * sequence, from `firstReconnectDelayMilliseconds` to
 * `maximumReconnectDelayMilliseconds`. The delay is a random value from the
 * half of the upper limit to the upper limit. Thus the delay grows with each
 * failed attempt, and the runtimes do not all connect at the same time after
 * a restart of the relay service.
 *
 * @param failedAttemptCount The failed attempts in sequence, from 1
 * @param random A random value from 0 to 1, as `Math.random()` gives it
 */
export const getReconnectDelayMilliseconds = (
  failedAttemptCount: number,
  random: () => number,
) => {
  const upperLimit = Math.min(
    CHANNEL_CLIENT_LIMITS.maximumReconnectDelayMilliseconds,
    CHANNEL_CLIENT_LIMITS.firstReconnectDelayMilliseconds *
      2 ** Math.max(0, failedAttemptCount - 1),
  );

  return upperLimit / 2 + (random() * upperLimit) / 2;
};
