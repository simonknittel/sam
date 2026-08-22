import { DISCORD_EVENT_LOCATION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import { EventDiscordPublishTarget } from "@sam-monorepo/database/client";
import { z } from "zod";

/**
 * Discord snowflakes are numeric strings well under this; the bound only
 * keeps an arbitrary client string out of the channel lookup.
 */
const DISCORD_CHANNEL_ID_MAX_LENGTH = 64;

/**
 * The fields `DiscordPublishTargetFields` submits, shared by every action
 * that reads them (publishing an event, creating one, editing a template).
 * Names and parsing live together with the component's contract so the three
 * cannot drift apart — they already did once, which made every publish from
 * the settings card fail validation.
 *
 * An absent target means "do not publish"; the actions that always publish
 * narrow it to required.
 */
export const discordPublishFieldsSchema = z.object({
  discordPublishTarget: z.enum(EventDiscordPublishTarget).optional(),
  /** Validated against the guild's own channels when the target is CHANNEL */
  discordPublishChannelId: z
    .string()
    .max(DISCORD_CHANNEL_ID_MAX_LENGTH)
    .optional(),
  discordPublishLocation: z
    .string()
    .trim()
    .max(DISCORD_EVENT_LOCATION_MAX_LENGTH)
    .optional(),
});

export type DiscordPublishFields = z.infer<typeof discordPublishFieldsSchema>;

export const parseDiscordPublishFields = (formData: FormData) => ({
  discordPublishTarget: formData.get("discordPublishTarget") || undefined,
  discordPublishChannelId: formData.get("discordPublishChannelId") || undefined,
  discordPublishLocation: formData.get("discordPublishLocation") || undefined,
});
