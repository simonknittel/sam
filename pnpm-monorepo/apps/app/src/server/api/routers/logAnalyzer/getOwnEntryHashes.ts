import { authorize } from "@/modules/auth/server";
import { ENTRY_HASH_PATTERN } from "@/modules/log-analyzer/utils/createEntryHash";
import {
  eventAtWindow,
  MAXIMUM_DAYS_TO_LOAD,
} from "@/modules/log-analyzer/utils/sharedEntries";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The upper limit of one response. A citizen with a longer history pages
 * through more than one request, thus the answer stays complete at any size —
 * a cap without paging would let the entries above it be uploaded again on
 * every page load.
 */
const MAXIMUM_HASHES_PER_REQUEST = 2000;

/**
 * The hashes of the entries the signed-in citizen already shared. The client
 * hashes what it parsed from the local log files and sends only what is
 * missing here, so a page load no longer offers the whole window to the
 * server again.
 *
 * Only hashes leave the server: they identify an entry for the unique index
 * without carrying the raw log line, which holds data of other players.
 *
 * The cursor runs along the hash. It is unique per citizen, thus it orders
 * the rows without a tiebreaker and the unique index serves the paging.
 */
export const getOwnEntryHashes = protectedProcedure
  .input(
    z.object({
      /** 0 loads without a time limit, as the local parsing does. */
      daysToLoad: z.int().min(0).max(MAXIMUM_DAYS_TO_LOAD),
      /** The last hash of the previous page. Absent for the first request. */
      cursorHash: z.string().regex(ENTRY_HASH_PATTERN).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      if (!(await authorize(ctx.session, "logAnalyzer", "read")))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing log analyzer permission",
        });

      const citizenId = ctx.session.entity?.id;
      /** Without a linked citizen the upload action refuses the entries too */
      if (!citizenId) return { hashes: [], cursorHash: null };

      const fetchHashes = withTrace("getOwnLogAnalyzerEntryHashes", () =>
        ctx.prisma.logAnalyzerEntry.findMany({
          where: {
            createdById: citizenId,
            eventAt: eventAtWindow(input.daysToLoad),
          },
          orderBy: { hash: "asc" },
          ...(input.cursorHash
            ? {
                cursor: {
                  createdById_hash: {
                    createdById: citizenId,
                    hash: input.cursorHash,
                  },
                },
                skip: 1,
              }
            : undefined),
          take: MAXIMUM_HASHES_PER_REQUEST,
          select: { hash: true },
        }),
      );

      const entries = await fetchHashes();
      const hashes = entries.map((entry) => entry.hash);

      /** Null ends the paging: a page below the limit holds the last rows */
      const cursorHash =
        hashes.length < MAXIMUM_HASHES_PER_REQUEST
          ? null
          : (hashes.at(-1) ?? null);

      return { hashes, cursorHash };
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch own log analyzer entry hashes");
    }
  });
