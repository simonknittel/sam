import { getApplicationContext, toActor } from "@/modules/application";
import { countOwnUnreadOnSiteNotifications } from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

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
