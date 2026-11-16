import { getApplicationContext, toActor } from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { findOwnLogAnalyzerEntryHashesInRange } from "@sam-monorepo/application";
import { LOG_ANALYZER_ENTRY_HASH_PATTERN } from "@sam-monorepo/domain";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";
import { dateRangeInputSchema } from "./dateRangeInputSchema";

/**
 * The hashes of the entries of a date range which the signed-in citizen
 * already shared. The sharing of older entries sends only what is missing
 * here. The kill switch closes the read path of the sharing.
 */
export const getOwnEntryHashesInRange = protectedProcedure
  .input(
    dateRangeInputSchema.and(
      z.object({
        /** The last hash of the previous page. Absent for the first request. */
        cursorHash: z
          .string()
          .regex(LOG_ANALYZER_ENTRY_HASH_PATTERN)
          .optional(),
      }),
    ),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await findOwnLogAnalyzerEntryHashesInRange(
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
        "Failed to fetch own log analyzer entry hashes of a date range",
      );
    }
  });
