import { getApplicationContext, toActor } from "@/modules/application";
import {
  findWikiPageDetails,
  idSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getPageDetails = protectedProcedure
  .input(z.object({ pageId: idSchema }))
  .query(async ({ ctx, input }) => {
    try {
      return await findWikiPageDetails(
        getApplicationContext(),
        await toActor(ctx.session),
        { pageId: input.pageId },
      );
    } catch (error) {
      if (error instanceof NotFoundError)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown page" });

      throw toTrpcError(error, "Failed to load wiki page details");
    }
  });
