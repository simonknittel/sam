import type {
  DiscordGuildChannel,
  DiscordScheduledEvent,
} from "@sam-monorepo/application";
import * as z from "zod";

/**
 * Discord returns at most 100 items in one response of these endpoints, and a
 * guild has at most 500 channels. The limit only bounds the loops over a
 * malformed response.
 */
const MAXIMUM_DISCORD_ITEM_COUNT = 1000;

/**
 * "Unknown Guild Scheduled Event" — the one 404 that really means "this
 * event is gone". A bare 404 must never be read that way: every
 * guild-scoped endpoint answers 404 "Unknown Guild" (10004) while the bot
 * is not in the guild at all (kicked, rotated token, wrong guild ID), and
 * treating that as "gone" would drop the publish state of every event the
 * app touches during such an outage.
 * https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
 */
export const DISCORD_ERROR_UNKNOWN_GUILD_SCHEDULED_EVENT = 10070;

/*
 * Each schema reads only the fields that the gateway uses, and it accepts a
 * null or an absent value for each field that Discord can leave out. The
 * output of a schema is the type of the port.
 */

/** Discord sends ISO 8601 timestamps with an offset */
const timestampSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

/**
 * https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-object
 */
const scheduledEventSchema = z
  .object({
    id: z.string(),
    guild_id: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    scheduled_start_time: timestampSchema,
    scheduled_end_time: timestampSchema.nullish(),
    description: z.string().nullish(),
    creator_id: z.string().nullish(),
    entity_metadata: z.object({ location: z.string().nullish() }).nullish(),
  })
  .transform((scheduledEvent): DiscordScheduledEvent => ({
    id: scheduledEvent.id,
    guildId: scheduledEvent.guild_id,
    name: scheduledEvent.name,
    description: scheduledEvent.description ?? null,
    image: scheduledEvent.image ?? null,
    startTime: scheduledEvent.scheduled_start_time,
    endTime: scheduledEvent.scheduled_end_time ?? null,
    creatorId: scheduledEvent.creator_id ?? null,
    // An empty location is no location
    location: scheduledEvent.entity_metadata?.location || null,
  }));

export const scheduledEventsResponseSchema = z
  .array(scheduledEventSchema)
  .max(MAXIMUM_DISCORD_ITEM_COUNT);

/**
 * https://discord.com/developers/docs/resources/guild-scheduled-event#get-guild-scheduled-event-users
 */
export const scheduledEventUserIdsResponseSchema = z
  .array(z.object({ user_id: z.string() }))
  .max(MAXIMUM_DISCORD_ITEM_COUNT)
  .transform((users) => users.map((user) => user.user_id));

/**
 * The `type` stays a plain number, so channels of the many other types parse
 * instead of failing the whole response. The caller filters them.
 */
const channelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.int(),
    position: z.int().nullish(),
  })
  .transform((channel): DiscordGuildChannel => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    position: channel.position ?? null,
  }));

export const channelsResponseSchema = z
  .array(channelSchema)
  .max(MAXIMUM_DISCORD_ITEM_COUNT);

/** Only the ID is read: the app is the source of truth for the rest */
export const createdScheduledEventResponseSchema = z.object({
  id: z.string(),
});

/**
 * The body of an error response. `retry_after` is only present on a 429 and
 * is a fractional number of seconds.
 * https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
 */
export const errorResponseSchema = z.object({
  code: z.int().optional(),
  message: z.string().optional(),
  retry_after: z.number().optional(),
});
