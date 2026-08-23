import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";

export interface IncomingLink {
  serviceName: string;
  url: string;
}

export const syncVariantExternalLinks = withTrace(
  "syncVariantExternalLinks",
  async (
    variantId: string,
    incomingLinks: IncomingLink[] | undefined,
    authorCitizenId: Entity["id"],
  ) => {
    await prisma.$transaction(async (tx) => {
      if (!incomingLinks || incomingLinks.length === 0) {
        await tx.variantExternalLink.deleteMany({
          where: { variantId },
        });
        return;
      }

      const existingLinks = await tx.variantExternalLink.findMany({
        where: { variantId },
      });

      const incomingServiceNames = new Set(
        incomingLinks.map((l) => l.serviceName),
      );

      const linksToDelete = existingLinks.filter(
        (existing) => !incomingServiceNames.has(existing.serviceName),
      );

      if (linksToDelete.length > 0) {
        await tx.variantExternalLink.deleteMany({
          where: {
            id: { in: linksToDelete.map((l) => l.id) },
          },
        });
      }

      for (const incoming of incomingLinks) {
        const existing = existingLinks.find(
          (l) => l.serviceName === incoming.serviceName,
        );

        if (existing) {
          await tx.variantExternalLink.update({
            where: { id: existing.id },
            data: {
              url: incoming.url,
              updatedById: authorCitizenId,
            },
          });
        } else {
          await tx.variantExternalLink.create({
            data: {
              variantId,
              serviceName: incoming.serviceName,
              url: incoming.url,
              createdById: authorCitizenId,
              updatedById: authorCitizenId,
            },
          });
        }
      }
    });
  },
);
