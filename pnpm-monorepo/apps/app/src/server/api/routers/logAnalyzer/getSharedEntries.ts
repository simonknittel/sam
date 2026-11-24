import { getApplicationContext, toActor } from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import {
  findSharedLogAnalyzerEntries,
  idSchema,
} from "@sam-monorepo/application";
import { MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD } from "@sam-monorepo/domain";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const getSharedEntries = protectedProcedure
  .input(
    z.object({
      daysToLoad: z.int().min(0).max(MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD),
      cursorId: idSchema.optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await findSharedLogAnalyzerEntries(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
        {
          isSharingDisabled: await getUnleashFlag(
            UNLEASH_FLAG.DisableLogAnalyzerSharing,
          ),
        },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch shared log analyzer entries");
    }
  });
