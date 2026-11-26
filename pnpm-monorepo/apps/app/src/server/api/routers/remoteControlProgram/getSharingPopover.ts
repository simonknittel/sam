import { getApplicationContext, toActor } from "@/modules/application";
import { getSharingPopover as getSharingPopoverQuery } from "@/modules/remote-control-program/queries/getSharingPopover";
import { REMOTE_CONTROL_PROGRAM_ERROR_TEXTS } from "@/modules/remote-control-program/utils/remoteControlProgramErrorTexts";
import { ForbiddenError } from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The data of the sharing popover (see `getSharingPopover()`). The shell
 * renders the popover in the top bar and in the mobile action bar, and the
 * server loader of the mobile action bar gives no data to the client. Thus
 * the popover reads it in the browser, at each open, because the presence
 * of the runtimes changes all the time. FORBIDDEN has a German text for the
 * popover as its message.
 */
export const getSharingPopover = protectedProcedure.query(async ({ ctx }) => {
  try {
    return await getSharingPopoverQuery(
      getApplicationContext(),
      await toActor(ctx.session),
    );
  } catch (error) {
    if (error instanceof ForbiddenError)
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          REMOTE_CONTROL_PROGRAM_ERROR_TEXTS[error.message] ??
          "Du kannst das Remote Control Program nicht nutzen.",
      });

    throw toTrpcError(error, "Failed to read the sharing popover");
  }
});
