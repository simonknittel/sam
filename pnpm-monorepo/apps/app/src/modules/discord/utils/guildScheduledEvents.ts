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
import { guildScheduledEventResponseSchema } from "./schemas";

const guildScheduledEventsPath = () =>
  `/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID)}/scheduled-events`;

const guildScheduledEventPath = (scheduledEventId: string) =>
  `${guildScheduledEventsPath()}/${encodeURIComponent(scheduledEventId)}`;

/** The guild scheduled event's page on Discord */
export const getGuildScheduledEventUrl = (scheduledEventId: string) =>
  `https://discord.com/events/${encodeURIComponent(env.DISCORD_GUILD_ID)}/${encodeURIComponent(scheduledEventId)}`;

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
  });

export const deleteGuildScheduledEvent = async (scheduledEventId: string) =>
  discordBotRequest({
    path: guildScheduledEventPath(scheduledEventId),
    method: DiscordRequestMethod.Delete,
  });
