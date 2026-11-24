import {
  getEntityTypeForChannelType,
  type PublishableGuildChannel,
} from "@sam-monorepo/domain";
import { DiscordOutcome, type ApplicationContext } from "../context.js";
import { callDiscord } from "./callDiscord.js";

/**
 * The only channels that Discord accepts as the location of a guild scheduled
 * event. Deliberately unfiltered by the viewer's own Discord permissions: the
 * app would have to mirror Discord's permission model to do that, and the bot
 * only ever sees channels it may see itself.
 *
 * No permission check, see the README.
 */
export const findPublishableDiscordChannels = async (
  context: ApplicationContext,
): Promise<PublishableGuildChannel[] | null> => {
  const result = await callDiscord(context, (gateway) =>
    gateway.listChannels(),
  );
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
