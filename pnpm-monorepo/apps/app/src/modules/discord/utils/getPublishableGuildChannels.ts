import "server-only";

import { env } from "@/env";
import {
  discordBotRequest,
  DiscordOutcome,
  DiscordRequestMethod,
} from "./discordBotRequest";
import {
  getEntityTypeForChannelType,
  type PublishableGuildChannel,
} from "./guildScheduledEventPayload";
import { guildChannelsResponseSchema } from "./schemas";

/**
 * The guild's voice and stage channels — the only ones Discord accepts as
 * the location of a guild scheduled event. Deliberately unfiltered by the
 * viewer's own Discord permissions: the app would have to mirror Discord's
 * permission model to do that, and the bot only ever sees channels it may
 * see itself.
 *
 * Resolves to null when Discord could not be reached, which the UI shows as
 * "channel picking unavailable" rather than as an empty guild.
 */
export const getPublishableGuildChannels = async (): Promise<
  PublishableGuildChannel[] | null
> => {
  const result = await discordBotRequest({
    path: `/guilds/${encodeURIComponent(env.DISCORD_GUILD_ID)}/channels`,
    method: DiscordRequestMethod.Get,
    responseSchema: guildChannelsResponseSchema,
  });
  if (result.outcome !== DiscordOutcome.Success) return null;

  return result.data
    .flatMap((channel) => {
      const entityType = getEntityTypeForChannelType(channel.type);
      if (entityType === null) return [];

      return [
        {
          id: channel.id,
          name: channel.name,
          entityType,
          position: channel.position ?? 0,
        },
      ];
    })
    .toSorted(
      (first, second) =>
        first.position - second.position ||
        first.name.localeCompare(second.name, "de"),
    )
    .map(({ id, name, entityType }) => ({ id, name, entityType }));
};
