import { getApplicationContext, toActor } from "@/modules/application";
import {
  ForbiddenError,
  listOwnOnSiteNotifications,
  listOwnOnSiteNotificationsInputSchema,
  ValidationError,
} from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, toTrpcError } from "../../trpc";

/** The client validates the payloads, as it does for the realtime events */
export const list = protectedProcedure
  .input(listOwnOnSiteNotificationsInputSchema)
  .query(async ({ ctx, input }) => {
    try {
      return await listOwnOnSiteNotifications(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );
    } catch (error) {
      if (error instanceof ForbiddenError)
        throw new TRPCError({ code: "FORBIDDEN", message: "Missing citizen" });

      if (error instanceof ValidationError)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown cursor" });

      throw toTrpcError(error, "Failed to load on-site notifications");
    }
  });
