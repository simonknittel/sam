import { getApplicationContext, toActor } from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import {
  findSharedLogAnalyzerEntriesInRange,
  idSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";
import { dateRangeInputSchema } from "./dateRangeInputSchema";

/**
 * The log entries of a date range. The kill switch closes the read path of
 * the sharing.
 */
export const getSharedEntriesInRange = protectedProcedure
  .input(
    dateRangeInputSchema.and(
      z.object({
        /** The last entry of the previous page. Absent for the first page. */
        cursorId: idSchema.optional(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await findSharedLogAnalyzerEntriesInRange(
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
      throw toTrpcError(
        error,
        "Failed to fetch shared log analyzer entries of a date range",
      );
    }
  });
