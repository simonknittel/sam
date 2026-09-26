/**
 * Without Zod, thus the browser can load these enums without the schemas.
 */

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
