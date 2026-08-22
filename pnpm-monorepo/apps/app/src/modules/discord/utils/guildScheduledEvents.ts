import "server-only";

import { env } from "@/env";
import {
  discordBotRequest,
  DiscordRequestMethod,
  type DiscordResult,
} from "./discordBotRequest";
import {
  buildCreateGuildScheduledEventPayload,
  buildModifyGuildScheduledEventPayload,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "./guildScheduledEventPayload";
import {
  DISCORD_ERROR_UNKNOWN_GUILD_SCHEDULED_EVENT,
  guildScheduledEventResponseSchema,
} from "./schemas";

const guildScheduledEventsPath = () =>
  `/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID)}/scheduled-events`;

const guildScheduledEventPath = (scheduledEventId: string) =>
  `${guildScheduledEventsPath()}/${encodeURIComponent(scheduledEventId)}`;

/**
 * The one error that means this event is gone from the guild, as opposed to
 * the guild itself being out of reach.
 */
const NOT_FOUND_ERROR_CODES = [DISCORD_ERROR_UNKNOWN_GUILD_SCHEDULED_EVENT];

/** Creates the guild scheduled event and resolves with its Discord id. */
export const createGuildScheduledEvent = async (
  content: GuildScheduledEventContent,
  target: GuildScheduledEventTarget,
): Promise<DiscordResult<{ id: string }>> =>
  discordBotRequest({
    path: guildScheduledEventsPath(),
    method: DiscordRequestMethod.Post,
    body: buildCreateGuildScheduledEventPayload(content, target),
    responseSchema: guildScheduledEventResponseSchema,
  });

/** Re-asserts the app's content on an already published event. */
export const modifyGuildScheduledEvent = async (
  scheduledEventId: string,
  content: GuildScheduledEventContent,
  now: Date,
) =>
  discordBotRequest({
    path: guildScheduledEventPath(scheduledEventId),
    method: DiscordRequestMethod.Patch,
    body: buildModifyGuildScheduledEventPayload(content, now),
    notFoundErrorCodes: NOT_FOUND_ERROR_CODES,
  });

export const deleteGuildScheduledEvent = async (scheduledEventId: string) =>
  discordBotRequest({
    path: guildScheduledEventPath(scheduledEventId),
    method: DiscordRequestMethod.Delete,
    notFoundErrorCodes: NOT_FOUND_ERROR_CODES,
  });
