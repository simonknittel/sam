import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { log } from "@/modules/logging";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * The guild's voice and stage channels a new event can be published into.
 * Loaded lazily by the create-event form, which only mounts while the modal
 * is open. Null means Discord could not be asked — the form says so rather
 * than showing an empty picker.
 *
 * No permission of its own: the channel names are already visible to every
 * guild member, and creating an event is what the form itself is gated on.
 */
export const getPublishableDiscordChannels = protectedProcedure.query(
  async () => {
    try {
      return await getPublishableGuildChannels();
    } catch (error) {
      log.error("Failed to fetch publishable Discord channels", {
        error: serializeError(error),
      });

      return null;
    }
  },
);
