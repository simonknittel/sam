import { getApplicationContext, toActor } from "@/modules/application";
import {
  idSchema,
  listCitizenLogHistory,
  listCitizenLogHistoryInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getHistory = protectedProcedure
  .input(
    z.object({
      type: listCitizenLogHistoryInputSchema.shape.type,
      citizenId: idSchema,
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await listCitizenLogHistory(
        getApplicationContext(),
        await toActor(ctx.session),
        { type: input.type, citizen_id: input.citizenId },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch the citizen log history");
    }
  });
