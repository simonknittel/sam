import { z } from "zod";

export const guildMemberResponseSchema = z.union([
  z.object({
    avatar: z.string().nullable(),
  }),

  z.object({
    message: z.string(),
  }),
]);

/**
 * The channel types a guild scheduled event can be attached to. Discord has
 * many more; the channel list is filtered to these two.
 * https://discord.com/developers/docs/resources/channel#channel-object-channel-types
 */
export enum DiscordChannelType {
  GuildVoice = 2,
  GuildStageVoice = 13,
}

/**
 * Only the fields the channel picker needs. The `type` stays a plain number
 * so channels of the many other types parse instead of failing the whole
 * response — they are filtered out afterwards.
 */
export const guildChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.int(),
  position: z.int().optional(),
  parent_id: z.string().nullish(),
});

/**
 * Discord caps a guild at 500 channels; the bound is here so a hostile or
 * broken response cannot make the app map an unbounded list.
 */
const MAX_GUILD_CHANNELS = 1000;

export const guildChannelsResponseSchema = z
  .array(guildChannelSchema)
  .max(MAX_GUILD_CHANNELS);

/**
 * https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-entity-types
 */
export enum DiscordScheduledEventEntityType {
  StageInstance = 1,
  Voice = 2,
  External = 3,
}

/**
 * GUILD_ONLY is the only level Discord still accepts for guild scheduled
 * events.
 * https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-privacy-level
 */
export enum DiscordScheduledEventPrivacyLevel {
  GuildOnly = 2,
}

/**
 * Only the id is consumed — the app is the source of truth for everything
 * else it publishes.
 */
export const guildScheduledEventResponseSchema = z.object({
  id: z.string(),
});

/**
 * Discord's error body. `retry_after` is only present on 429s and is a
 * fractional number of seconds.
 * https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
 */
export const discordErrorResponseSchema = z.object({
  code: z.int().optional(),
  message: z.string().optional(),
  retry_after: z.number().optional(),
});

/**
 * "Unknown Guild Scheduled Event" — the one 404 that really means "this
 * event is gone". A bare 404 must never be read that way: every
 * guild-scoped endpoint answers 404 "Unknown Guild" (10004) while the bot
 * is not in the guild at all (kicked, rotated token, wrong guild id), and
 * treating that as "gone" would drop the publish state of every event the
 * app touches during such an outage.
 * https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
 */
export const DISCORD_ERROR_UNKNOWN_GUILD_SCHEDULED_EVENT = 10070;
