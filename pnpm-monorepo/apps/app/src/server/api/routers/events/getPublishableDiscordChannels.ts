import { getApplicationContext, toActor } from "@/modules/application";
import { log } from "@/modules/logging";
import { findPublishableDiscordChannels } from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc";

/**
 * Null means that Discord could not be asked.
 *
 * Gated on `event;create`, the permission of the create form: the bot sees
 * channels the caller may not, and every call is an uncached request against
 * the bot's shared Discord rate limit. The use case has no check of its own.
 */
export const getPublishableDiscordChannels = protectedProcedure.query(
  async ({ ctx }) => {
    if (!(await toActor(ctx.session)).authorize("event", "create"))
      throw new TRPCError({ code: "FORBIDDEN" });

    try {
      return await findPublishableDiscordChannels(getApplicationContext());
    } catch (error) {
      log.error("Failed to fetch publishable Discord channels", {
        error,
      });

      return null;
    }
  },
);
