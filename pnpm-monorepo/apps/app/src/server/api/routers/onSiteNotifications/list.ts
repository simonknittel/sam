import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { ON_SITE_NOTIFICATIONS_PAGE_SIZE } from "@/modules/notifications/utils/config";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Pages through the current citizen's on-site notifications, newest first.
 * The inbox tab lists unarchived notifications, the archive tab archived
 * ones. Loaded lazily on first popover open; payload validation happens
 * client-side via the shared schemas (same code path as realtime events).
 */
export const list = protectedProcedure
  .input(
    z.object({
      tab: z.enum(["inbox", "archive"]),
      cursor: z.cuid2().nullish(),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      const entityId = ctx.session.entity?.id;
      if (!entityId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Missing citizen" });

      const rows = await prisma.onSiteNotification.findMany({
        where: {
          citizenId: entityId,
          archivedAt: input.tab === "archive" ? { not: null } : null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: ON_SITE_NOTIFICATIONS_PAGE_SIZE + 1,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1 }
          : undefined),
      });

      const hasNextPage = rows.length > ON_SITE_NOTIFICATIONS_PAGE_SIZE;
      const items = hasNextPage
        ? rows.slice(0, ON_SITE_NOTIFICATIONS_PAGE_SIZE)
        : rows;

      return {
        items,
        nextCursor: hasNextPage ? items.at(-1)!.id : null,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      log.error("Failed to load on-site notifications", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to load on-site notifications",
      });
    }
  });
