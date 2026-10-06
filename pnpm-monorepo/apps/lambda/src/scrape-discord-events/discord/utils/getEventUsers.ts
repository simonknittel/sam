import { setTimeout } from "node:timers/promises";
import * as z from "zod";
import { log } from "../../../common/logger";
import { env } from "../../setup";
import { checkResponseForError } from "./checkResponseForError";
import {
  MAXIMUM_DISCORD_ITEM_COUNT,
  memberSchema,
  userSchema,
} from "./schemas";

/** The maximum `limit` of the endpoint */
const PAGE_SIZE = 100;

/**
 * 10,000 users, far more than the interested users of an event of the guild.
 * The limit only stops an endless loop when Discord does not return what its
 * documentation says.
 */
const MAXIMUM_PAGE_COUNT = 100;

const MAXIMUM_ATTEMPT_COUNT = 5;

/**
 * Returns all users that are interested in the event. The caller cancels the
 * participation of each user that is not in the result. Thus this function
 * reads all pages, or it throws an error.
 */
export const getEventUsers = async (discordId: string) => {
  const users: z.infer<typeof successSchema> = [];

  for (let pageIndex = 0; pageIndex < MAXIMUM_PAGE_COUNT; pageIndex++) {
    const page = await getEventUsersPage(discordId, users.at(-1)?.user_id);
    users.push(...page);

    if (page.length < PAGE_SIZE) return users;
  }

  throw new Error(
    `Discord returned more than ${MAXIMUM_PAGE_COUNT * PAGE_SIZE} users for the event "${discordId}"`,
  );
};

/**
 * https://discord.com/developers/docs/resources/guild-scheduled-event#get-guild-scheduled-event-users
 *
 * Discord returns the users in ascending order of their ID. `after` is the
 * last user ID of the previous page.
 */
const getEventUsersPage = async (discordId: string, after?: string) => {
  const url = new URL(
    `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/scheduled-events/${discordId}/users`,
  );
  url.searchParams.set("with_member", "true");
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (after) url.searchParams.set("after", after);

  let response;

  for (let attempt = 0; attempt < MAXIMUM_ATTEMPT_COUNT; attempt++) {
    response = await fetch(url, {
      headers: new Headers({
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 429) break;
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10) + 1
      : 1;
    log.warn("Hit rate limit of Discord", {
      endpoint: "getEventUsers",
      retryAfter: retryAfterSeconds,
      attempt,
    });
    await setTimeout(retryAfterSeconds * 1000);
  }
  if (!response) throw new Error("Failed to fetch");

  const body: unknown = await response.json();
  const data = schema.parse(body);

  checkResponseForError(data);

  return data as z.infer<typeof successSchema>;
};

const successSchema = z
  .array(
    z.object({
      user_id: z.string(),
      user: userSchema,
      member: memberSchema,
    }),
  )
  .max(MAXIMUM_DISCORD_ITEM_COUNT);

const errorSchema = z.object({
  message: z.string(),
});

const schema = z.union([successSchema, errorSchema]);
