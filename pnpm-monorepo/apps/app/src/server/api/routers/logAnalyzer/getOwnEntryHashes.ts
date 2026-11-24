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

export const getOwnEntryHashes = protectedProcedure
  .input(
    z.object({
      daysToLoad: z.int().min(0).max(MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD),
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
