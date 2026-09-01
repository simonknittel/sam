import { authorize } from "@/modules/auth/server";
import {
  eventAtWindow,
  MAXIMUM_DAYS_TO_LOAD,
} from "@/modules/log-analyzer/utils/sharedEntries";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The upper limit of one response. A viewer who joins late gets the entries
 * which were shared last, then the cursor keeps them up to date.
 */
const MAXIMUM_ENTRIES_PER_REQUEST = 500;

/**
 * The log entries other citizens shared. The cursor moves along the creation
 * time and not along the event time, because a citizen who shares their
 * history for the first time adds old events with a new creation time.
 */
export const getSharedEntries = protectedProcedure
  .input(
    z.object({
      /** 0 loads without a time limit, as the local parsing does. */
      daysToLoad: z.int().min(0).max(MAXIMUM_DAYS_TO_LOAD),
      /** The newest entry the client holds. Absent for the first request. */
      cursorId: z.cuid2().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      if (!(await authorize(ctx.session, "logAnalyzer", "read")))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing log analyzer permission",
        });

      const isIncremental = Boolean(input.cursorId);
      const direction = isIncremental ? "asc" : "desc";

      const fetchEntries = withTrace("getSharedLogAnalyzerEntries", () =>
        ctx.prisma.logAnalyzerEntry.findMany({
          where: { eventAt: eventAtWindow(input.daysToLoad) },
          /**
           * The id breaks the tie of two entries of the same moment, so the
           * cursor cannot step over one of them.
           */
          orderBy: [{ createdAt: direction }, { id: direction }],
          ...(input.cursorId
            ? { cursor: { id: input.cursorId }, skip: 1 }
            : undefined),
          take: MAXIMUM_ENTRIES_PER_REQUEST,
          select: {
            id: true,
            type: true,
            rawLine: true,
            eventAt: true,
            createdBy: {
              select: {
                id: true,
                handle: true,
              },
            },
          },
        }),
      );

      const entries = await fetchEntries();

      /**
       * The newest entry of this response, which the next request continues
       * from. Null keeps the cursor the client already has.
       */
      const cursorId =
        (isIncremental ? entries.at(-1)?.id : entries.at(0)?.id) ?? null;

      return { entries, cursorId };
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch shared log analyzer entries");
    }
  });
