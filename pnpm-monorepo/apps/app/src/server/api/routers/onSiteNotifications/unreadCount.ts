import { getApplicationContext, toActor } from "@/modules/application";
import { countOwnUnreadOnSiteNotifications } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The number of unread notifications in the inbox of the current citizen.
 * The bell fetches it again after each change of the read state, thus the
 * count does not drift from the server.
 */
export const unreadCount = protectedProcedure.query(async ({ ctx }) => {
  try {
    return await countOwnUnreadOnSiteNotifications(
      getApplicationContext(),
      await toActor(ctx.session),
    );
  } catch (error) {
    throw toTrpcError(error, "Failed to count the unread notifications");
  }
});
