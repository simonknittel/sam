import {
  DiscordChannelType,
  DiscordScheduledEventEntityType,
  DiscordScheduledEventPrivacyLevel,
} from "./schemas";

/**
 * The guild scheduled event's page on Discord, as a path for `DiscordButton`.
 * Lives in this client-safe module because both the event overview (a Server
 * Component) and the settings card (a Client one) link there.
 */
export const getGuildScheduledEventPath = (
  guildId: string,
  scheduledEventId: string,
) =>
  `events/${encodeURIComponent(guildId)}/${encodeURIComponent(scheduledEventId)}`;

/** https://discord.com/developers/docs/resources/guild-scheduled-event */
export const DISCORD_EVENT_NAME_MAX_LENGTH = 100;
export const DISCORD_EVENT_DESCRIPTION_MAX_LENGTH = 1000;
export const DISCORD_EVENT_LOCATION_MAX_LENGTH = 100;

/**
 * Where the published event points on Discord. A channel carries its own
 * entity type — Discord distinguishes voice from stage events — while an
 * external event carries a free-text location instead.
 */
export type GuildScheduledEventTarget =
  | {
      readonly entityType:
        | DiscordScheduledEventEntityType.Voice
        | DiscordScheduledEventEntityType.StageInstance;
      readonly channelId: string;
    }
  | {
      readonly entityType: DiscordScheduledEventEntityType.External;
      readonly location: string;
    };

/**
 * One channel the manager may attach an event to. Lives here rather than
 * next to the fetch so client components can name the shape without pulling
 * the server-only Discord client into their bundle.
 */
export interface PublishableGuildChannel {
  readonly id: string;
  readonly name: string;
  readonly entityType:
    | DiscordScheduledEventEntityType.Voice
    | DiscordScheduledEventEntityType.StageInstance;
}

/**
 * A lookup rather than a switch: the input is one of Discord's many channel
 * types (a plain number from the API), of which only these two carry events.
 */
const ENTITY_TYPE_BY_CHANNEL_TYPE = new Map<
  number,
  | DiscordScheduledEventEntityType.Voice
  | DiscordScheduledEventEntityType.StageInstance
>([
  [DiscordChannelType.GuildVoice, DiscordScheduledEventEntityType.Voice],
  [
    DiscordChannelType.GuildStageVoice,
    DiscordScheduledEventEntityType.StageInstance,
  ],
]);

/**
 * The entity type a guild scheduled event in the given channel gets, or null
 * for channel types Discord does not accept as an event location.
 */
export const getEntityTypeForChannelType = (channelType: number) =>
  ENTITY_TYPE_BY_CHANNEL_TYPE.get(channelType) ?? null;

export interface GuildScheduledEventContent {
  readonly name: string;
  /**
   * Never absent: the app appends the sign-up note to every description it
   * sends, so an event without a description of its own still carries the
   * note. This also avoids the asymmetry of the two endpoints — modify
   * accepts a null, create does not.
   */
  readonly description: string;
  readonly startTime: Date;
  readonly endTime: Date;
  /**
   * A `data:` URI to set as the cover, `null` when the app has no cover (so
   * Discord's is cleared), or `undefined` when the cover could not be read.
   * The last case leaves the key out of the payload — a transient S3 or
   * format problem must not wipe a cover that is already on Discord.
   */
  readonly imageDataUri: string | null | undefined;
}

/**
 * `POST /guilds/{guild.id}/scheduled-events`. `channel_id` must be absent
 * for EXTERNAL events and `entity_metadata` for the channel-bound ones —
 * Discord rejects the payload otherwise.
 */
export const buildCreateGuildScheduledEventPayload = (
  content: GuildScheduledEventContent,
  target: GuildScheduledEventTarget,
) => ({
  name: content.name,
  description: content.description,
  scheduled_start_time: content.startTime.toISOString(),
  scheduled_end_time: content.endTime.toISOString(),
  ...(content.imageDataUri === undefined
    ? {}
    : { image: content.imageDataUri }),
  privacy_level: DiscordScheduledEventPrivacyLevel.GuildOnly,
  entity_type: target.entityType,
  ...(target.entityType === DiscordScheduledEventEntityType.External
    ? { entity_metadata: { location: target.location } }
    : { channel_id: target.channelId }),
});

/**
 * `PATCH /guilds/{guild.id}/scheduled-events/{id}`. Only the app-owned
 * content is sent: the target is chosen once when publishing, and changing
 * `entity_type` would have to carry the matching channel or location with
 * it.
 *
 * The schedule is left out entirely once the event has started. Discord
 * refuses to move an active event's start, and sending only the end would
 * have it validated against the start Discord still holds — a manager who
 * moves a running event's times would then get the whole PATCH rejected,
 * losing the title and description edits in the same save. The times on
 * Discord are left as they are instead (the plan accepts drift).
 */
export const buildModifyGuildScheduledEventPayload = (
  content: GuildScheduledEventContent,
  now: Date,
) => ({
  name: content.name,
  description: content.description,
  ...(content.startTime > now
    ? {
        scheduled_start_time: content.startTime.toISOString(),
        scheduled_end_time: content.endTime.toISOString(),
      }
    : {}),
  ...(content.imageDataUri === undefined
    ? {}
    : { image: content.imageDataUri }),
});

export enum GuildScheduledEventContentProblem {
  /**
   * Checked by the caller before the content is built: Discord requires an
   * end time for EXTERNAL events, and the app has one for every event it
   * creates itself.
   */
  MissingEndTime = "MISSING_END_TIME",
  NameTooLong = "NAME_TOO_LONG",
  DescriptionTooLong = "DESCRIPTION_TOO_LONG",
  LocationTooLong = "LOCATION_TOO_LONG",
  StartInThePast = "START_IN_THE_PAST",
  EndBeforeStart = "END_BEFORE_START",
}

/**
 * Caps Discord enforces on every request that carries the app's content.
 * The app's own name limit is higher, and the description measured here is
 * the composed one — the manager's text plus the sign-up note — so a row
 * written before the app reserved room for the note can exceed the cap.
 * Also the check for a published event's later edits: a start time now in
 * the past is fine there, since the modify payload leaves it out.
 */
export const findContentProblem = (
  content: GuildScheduledEventContent,
): GuildScheduledEventContentProblem | null => {
  if (content.name.length > DISCORD_EVENT_NAME_MAX_LENGTH)
    return GuildScheduledEventContentProblem.NameTooLong;

  if (content.description.length > DISCORD_EVENT_DESCRIPTION_MAX_LENGTH)
    return GuildScheduledEventContentProblem.DescriptionTooLong;

  return null;
};

/**
 * What Discord would reject about publishing this event, checked before the
 * request so the app can explain it instead of surfacing a bare API failure.
 */
export const findPublishProblem = (
  content: GuildScheduledEventContent,
  target: GuildScheduledEventTarget,
  now: Date,
): GuildScheduledEventContentProblem | null => {
  const contentProblem = findContentProblem(content);
  if (contentProblem) return contentProblem;

  if (
    target.entityType === DiscordScheduledEventEntityType.External &&
    target.location.length > DISCORD_EVENT_LOCATION_MAX_LENGTH
  )
    return GuildScheduledEventContentProblem.LocationTooLong;

  if (content.startTime <= now)
    return GuildScheduledEventContentProblem.StartInThePast;

  if (content.endTime <= content.startTime)
    return GuildScheduledEventContentProblem.EndBeforeStart;

  return null;
};
