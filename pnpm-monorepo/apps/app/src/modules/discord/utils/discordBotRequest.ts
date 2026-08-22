import "server-only";

import { env } from "@/env";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { serializeError } from "serialize-error";
import type { z } from "zod";
import { discordErrorResponseSchema } from "./schemas";

/**
 * Publishing happens inside an interactive request, so a hanging Discord
 * must not hold the action open for long.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Discord answers a rate limit with the seconds to wait. Publishing is
 * low-volume, so one short wait is enough; anything longer is reported as a
 * failure rather than blocking the request further.
 */
const MAX_RETRY_AFTER_SECONDS = 5;

export enum DiscordOutcome {
  Success = "SUCCESS",
  /**
   * Discord named one of the caller's `notFoundErrorCodes`, i.e. this exact
   * resource is gone. Callers treat it as "someone deleted it there" and
   * drop their own state, so it is deliberately narrower than "the response
   * was a 404" — see the codes' doc comment.
   */
  NotFound = "NOT_FOUND",
  /** Anything else: unreachable, rate-limited, rejected, malformed. */
  Failed = "FAILED",
}

export type DiscordResult<Data> =
  | { readonly outcome: DiscordOutcome.Success; readonly data: Data }
  | { readonly outcome: DiscordOutcome.NotFound }
  | { readonly outcome: DiscordOutcome.Failed };

export enum DiscordRequestMethod {
  Get = "GET",
  Post = "POST",
  Patch = "PATCH",
  Delete = "DELETE",
}

interface RequestOptions<Schema extends z.ZodType> {
  /** Path below the API base, starting with a slash */
  readonly path: string;
  readonly method: DiscordRequestMethod;
  readonly body?: unknown;
  /**
   * Omitted where the response carries nothing the app needs — Discord
   * answers DELETE with an empty 204, and a modified event is fully
   * described by what the app just sent.
   */
  readonly responseSchema?: Schema;
  /**
   * Discord JSON error codes that mean "the resource this call addresses no
   * longer exists" and nothing broader. Omitted where the caller has no
   * self-healing to do, in which case every error is a plain failure.
   */
  readonly notFoundErrorCodes?: readonly number[];
}

/**
 * `new URL(path, base)` would drop the base's own `/api/v10` path, so the
 * two are concatenated instead. Ids interpolated into a path are encoded by
 * the callers.
 */
const buildUrl = (path: string) =>
  `${env.DISCORD_API_BASE_URL.replace(/\/+$/, "")}${path}`;

/**
 * Discord requires this exact shape and may block requests without it at
 * the Cloudflare layer.
 * https://discord.com/developers/docs/reference#user-agent
 */
const USER_AGENT = `DiscordBot (${env.NEXT_PUBLIC_BASE_URL}, ${env.COMMIT_SHA ?? "0.0.0"})`;

const parseErrorBody = async (response: Response) => {
  try {
    const body: unknown = await response.json();
    const parsed = discordErrorResponseSchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/**
 * Seconds Discord asks the app to wait, from the error body or the header,
 * or null when it named neither (in which case the request is not retried).
 */
const getRetryAfterSeconds = (
  response: Response,
  retryAfterFromBody: number | undefined,
) => {
  if (retryAfterFromBody !== undefined) return retryAfterFromBody;

  const header = response.headers.get("Retry-After");
  if (header === null) return null;

  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : null;
};

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * One authenticated call to Discord's REST API as the app's bot. Never
 * throws: every failure mode collapses into a `DiscordResult` so callers can
 * decide between self-healing (404) and warning the user, without a Discord
 * outage ever taking an app-side mutation with it.
 */
export const discordBotRequest = <Schema extends z.ZodType = z.ZodUnknown>(
  options: RequestOptions<Schema>,
): Promise<DiscordResult<z.infer<Schema>>> =>
  withTrace(`discord ${options.method}`, () => sendRequest(options))();

const sendRequest = async <Schema extends z.ZodType>({
  path,
  method,
  body,
  responseSchema,
  notFoundErrorCodes,
}: RequestOptions<Schema>): Promise<DiscordResult<z.infer<Schema>>> => {
  for (let attempt = 1; ; attempt++) {
    let response: Response;

    try {
      response = await fetch(buildUrl(path), {
        method,
        headers: {
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
          "User-Agent": USER_AGENT,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      log.error("Discord API request failed", {
        path,
        method,
        error: serializeError(error),
      });
      return { outcome: DiscordOutcome.Failed };
    }

    if (!response.ok) {
      const errorBody = await parseErrorBody(response);

      /**
       * Keyed on Discord's own error code rather than the status: a 404
       * alone can just as well mean the bot lost the guild, and callers act
       * destructively on this outcome.
       */
      if (
        errorBody?.code !== undefined &&
        notFoundErrorCodes?.includes(errorBody.code)
      ) {
        log.warn("Discord API reported the resource as gone", {
          path,
          method,
          discordErrorCode: errorBody.code,
        });
        return { outcome: DiscordOutcome.NotFound };
      }

      const retryAfterSeconds =
        response.status === 429
          ? getRetryAfterSeconds(response, errorBody?.retry_after)
          : null;
      const willRetry =
        attempt === 1 &&
        retryAfterSeconds !== null &&
        retryAfterSeconds <= MAX_RETRY_AFTER_SECONDS;

      log.warn("Discord API rejected the request", {
        path,
        method,
        status: response.status,
        discordErrorCode: errorBody?.code,
        discordErrorMessage: errorBody?.message,
        willRetry,
      });

      if (!willRetry) return { outcome: DiscordOutcome.Failed };

      await sleep(Math.max(retryAfterSeconds, 0) * 1000);
      continue;
    }

    /**
     * Without a schema the body is irrelevant to the caller; `data` is
     * `unknown` for them (the generic's default) and simply goes unread.
     */
    if (!responseSchema)
      return {
        outcome: DiscordOutcome.Success,
        data: undefined as z.infer<Schema>,
      };

    try {
      const responseBody: unknown = await response.json();
      return {
        outcome: DiscordOutcome.Success,
        data: responseSchema.parse(responseBody),
      };
    } catch (error) {
      log.error("Discord API returned an unexpected response body", {
        path,
        method,
        error: serializeError(error),
      });
      return { outcome: DiscordOutcome.Failed };
    }
  }
};
