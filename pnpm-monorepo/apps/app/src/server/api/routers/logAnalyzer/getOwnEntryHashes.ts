import { getApplicationContext, toActor } from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { findOwnLogAnalyzerEntryHashes } from "@sam-monorepo/application";
import {
  LOG_ANALYZER_ENTRY_HASH_PATTERN,
  MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The hashes of the entries the signed-in citizen already shared. The client
 * hashes what it parsed from the local log files and sends only what is
 * missing here, so a page load does not send the whole window again. The kill
 * switch closes the read path of the sharing.
 */
export const getOwnEntryHashes = protectedProcedure
  .input(
    z.object({
      /** 0 loads without a time limit, as the local parsing does. */
      daysToLoad: z.int().min(0).max(MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD),
      /** The last hash of the previous page. Absent for the first request. */
      cursorHash: z.string().regex(LOG_ANALYZER_ENTRY_HASH_PATTERN).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await findOwnLogAnalyzerEntryHashes(
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
      throw toTrpcError(error, "Failed to fetch own log analyzer entry hashes");
    }
  });
