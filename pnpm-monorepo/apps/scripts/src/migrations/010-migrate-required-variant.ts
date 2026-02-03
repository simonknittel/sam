import { prisma } from "@sam-monorepo/database";

async function main() {
  const positions = await prisma.eventPosition.findMany({
    where: {
      requiredVariantId: {
        not: null,
      },
    },
  });

  for (const position of positions) {
    await prisma.eventPosition.update({
      where: {
        id: position.id,
      },
      data: {
        requiredVariants: {
          create: [
            {
              variantId: position.requiredVariantId!,
              order: 0,
            },
          ],
        },
      },
    });
  }
}

void main().then(() => console.info("Finished."));
