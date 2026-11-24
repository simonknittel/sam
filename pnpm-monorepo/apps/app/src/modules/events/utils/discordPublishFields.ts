/**
 * Every action that reads the fields of `DiscordPublishTargetFields`
 * (publishing an event, creating one, editing a template) uses this, so the
 * names of the component and of the schema cannot drift apart.
 */
export const parseDiscordPublishFields = (formData: FormData) => ({
  discord_publish_target: formData.get("discordPublishTarget") || undefined,
  discord_publish_channel_id:
    formData.get("discordPublishChannelId") || undefined,
  discord_publish_location: formData.get("discordPublishLocation") || undefined,
});
