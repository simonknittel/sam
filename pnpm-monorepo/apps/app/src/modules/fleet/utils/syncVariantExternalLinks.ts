import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export interface IncomingLink {
  serviceName: string;
  url: string;
}

export const syncVariantExternalLinks = withTrace(
  "syncVariantExternalLinks",
  async (variantId: string, incomingLinks: IncomingLink[] | undefined) => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) throw new Error("Unauthorized");

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
              updatedById: authentication.session.entity!.id,
            },
          });
        } else {
          await tx.variantExternalLink.create({
            data: {
              variantId,
              serviceName: incoming.serviceName,
              url: incoming.url,
              createdById: authentication.session.entity!.id,
              updatedById: authentication.session.entity!.id,
            },
          });
        }
      }
    });
  },
);
