import { authorize } from "@/modules/auth/server";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * The guild's voice and stage channels a new event can be published into.
 * Loaded lazily by the create-event form, which only mounts while the modal
 * is open. Null means Discord could not be asked — the form says so rather
 * than showing an empty picker.
 *
 * Gated on `event;create`, the permission the form itself needs: the bot
 * sees channels the caller may not, and every call is an uncached request
 * against the bot's shared Discord rate limit.
 */
export const getPublishableDiscordChannels = protectedProcedure.query(
  async ({ ctx }) => {
    if (!(await authorize(ctx.session, "event", "create")))
      throw new TRPCError({ code: "FORBIDDEN" });

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
