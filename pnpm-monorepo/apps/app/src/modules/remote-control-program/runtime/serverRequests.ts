import {
  connectionTokenSchema,
  LOG_ANALYZER_ENTRY_HASH_PATTERN,
} from "@sam-monorepo/domain";
import {
  ConnectionTokenRefusedError,
  type ConnectionTokenGrant,
  type OwnEntryKeysPage,
  type OwnEntryKeysQuery,
} from "@sam-monorepo/remote-control-program-runtime";
import * as z from "zod";

/**
 * The requests of the runtime to the app. They use route handlers and not
 * server actions: the URL of a route stays the same after a deploy, thus a
 * tab that is open during a deploy continues to work. A server action also
 * goes through the action queue of the router.
 */

const CONNECTION_TOKEN_PATH = "/api/remote-control-program/connection-token";
const OWN_FEED_ENTRY_KEYS_PATH =
  "/api/remote-control-program/own-feed-entry-keys";

/** The same time as the token request of the channel client */
const CONNECTION_TOKEN_TIMEOUT_MILLISECONDS = 5_000;

/** One page of keys needs one query of the database */
const OWN_FEED_ENTRY_KEYS_TIMEOUT_MILLISECONDS = 10_000;

/** Longer than a `wss://` URL of a host */
const MAXIMUM_RELAY_URL_LENGTH = 2_048;

/**
 * Above the page size of the route (2,000 keys, see
 * `MAXIMUM_FEED_ENTRY_KEYS_PER_READ` of the application package), thus a
 * larger page of a later release still parses in a tab that is open during
 * the deploy
 */
const MAXIMUM_KEYS_PER_PAGE = 10_000;

const connectionTokenResponseSchema = z.object({
  token: connectionTokenSchema,
  relay_url: z
    .url({ protocol: /^wss?$/ })
    .max(MAXIMUM_RELAY_URL_LENGTH)
    .nullable(),
});

const entryKeySchema = z.string().regex(LOG_ANALYZER_ENTRY_HASH_PATTERN);

const ownFeedEntryKeysResponseSchema = z.object({
  keys: z.array(entryKeySchema).max(MAXIMUM_KEYS_PER_PAGE),
  next_page_cursor: entryKeySchema.nullable(),
});

/**
 * The token source of the channel client: a token for one connection of the
 * runtime, and the URL of the relay. A 401 or a 403 of the route (for example
 * without `remoteControlProgram;use`, after a ban, or in an assumed session)
 * throws `ConnectionTokenRefusedError`.
 */
export const requestConnectionToken = async (
  runtimeId: string,
  signal: AbortSignal,
): Promise<ConnectionTokenGrant> => {
  const response = await fetch(
    new URL(CONNECTION_TOKEN_PATH, window.location.origin),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runtime_id: runtimeId }),
      cache: "no-store",
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(CONNECTION_TOKEN_TIMEOUT_MILLISECONDS),
      ]),
    },
  );

  if (response.status === 401 || response.status === 403)
    throw new ConnectionTokenRefusedError();
  if (!response.ok)
    throw new Error(`The token route answered with ${response.status}`);

  const body = connectionTokenResponseSchema.parse(await response.json());
  return {
    token: body.token,
    relayUrl: body.relay_url === null ? null : new URL(body.relay_url),
  };
};

/** The keys of the own entries that the relay has */
export const findOwnEntryKeys = async ({
  start,
  end,
  pageCursor,
}: OwnEntryKeysQuery): Promise<OwnEntryKeysPage> => {
  const url = new URL(OWN_FEED_ENTRY_KEYS_PATH, window.location.origin);
  url.searchParams.set("start", start.toISOString());
  url.searchParams.set("end", end.toISOString());
  if (pageCursor !== null) url.searchParams.set("page_cursor", pageCursor);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(OWN_FEED_ENTRY_KEYS_TIMEOUT_MILLISECONDS),
  });
  if (!response.ok)
    throw new Error(`The key route answered with ${response.status}`);

  const body = ownFeedEntryKeysResponseSchema.parse(await response.json());
  return { keys: body.keys, nextPageCursor: body.next_page_cursor };
};
