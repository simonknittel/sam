import { getApplicationContext, toActor } from "@/modules/application";
import { eventContainerSchema } from "@/modules/events/utils/eventContainerSchema";
import {
  findWikiScopeTags,
  toWikiScopeTarget,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getTags = protectedProcedure
  .input(z.object({ container: eventContainerSchema.optional() }).optional())
  .query(async ({ ctx, input }) => {
    try {
      return await findWikiScopeTags(
        getApplicationContext(),
        await toActor(ctx.session),
        toWikiScopeTarget(input ?? {}),
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to load wiki tags");
    }
  });
