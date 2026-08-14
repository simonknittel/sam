import { prisma } from "@/db";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Metadata for the page header's details popover, loaded on demand rather
 * than with the page: creator and last editor are not part of the wiki
 * context, whose select runs for every page of the tree.
 */
export const getPageDetails = protectedProcedure
  .input(z.object({ pageId: z.cuid2() }))
  .query(async ({ input }) => {
    try {
      const context = await getWikiContext();
      if (!context)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing wiki permission",
        });

      const page = context.pagesById.get(input.pageId);
      const permissions = context.permissions.get(input.pageId);
      if (!page || page.deletedAt || !permissions?.canRead)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown page" });

      const [authors, owner] = await Promise.all([
        prisma.wikiPage.findUnique({
          where: { id: page.id },
          select: {
            createdBy: { select: { id: true, handle: true } },
            updatedBy: { select: { id: true, handle: true } },
          },
        }),
        permissions.effectiveOwnerId
          ? prisma.entity.findUnique({
              where: { id: permissions.effectiveOwnerId },
              select: { id: true, handle: true },
            })
          : Promise.resolve(null),
      ]);

      /**
       * Read access is bounded by the parent's, so the ancestor supplying an
       * inherited owner is readable for everyone who can read this page.
       */
      const ownerSource =
        permissions.ownerSourceId === page.id
          ? null
          : (context.pagesById.get(permissions.ownerSourceId) ?? null);

      return {
        title: page.title,
        owner,
        ownerInheritedFrom: ownerSource
          ? {
              id: ownerSource.id,
              title: ownerSource.title,
              slug: ownerSource.slug,
            }
          : null,
        createdBy: authors?.createdBy ?? null,
        createdAt: page.createdAt,
        updatedBy: authors?.updatedBy ?? null,
        updatedAt: page.updatedAt,
      };
    } catch (error) {
      throw toTrpcError(error, "Failed to load wiki page details");
    }
  });
