import { getApplicationContext, toActor } from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import {
  findSharedLogAnalyzerEntriesInRange,
  idSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The log entries of a date range. The kill switch closes the read path of
 * the sharing.
 */
export const getSharedEntriesInRange = protectedProcedure
  .input(
    z
      .object({
        from: z.date().optional(),
        /** Exclusive */
        to: z.date().optional(),
        /** The last entry of the previous page. Absent for the first page. */
        cursorId: idSchema.optional(),
      })
      .refine(({ from, to }) => from !== undefined || to !== undefined, {
        error: "A date range needs at least one bound",
      })
      .refine(({ from, to }) => !from || !to || from < to, {
        error: "The start of a date range must be before its end",
      }),
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
