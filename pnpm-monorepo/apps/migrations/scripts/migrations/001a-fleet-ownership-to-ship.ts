import { prisma } from "@sam-monorepo/database";

async function main() {
  const ownerships = await prisma.fleetOwnership.findMany();

  for (const ownership of ownerships) {
    for (let i = 0; i < ownership.count; i++) {
      await prisma.ship.create({
        data: {
          owner: {
            connect: {
              id: ownership.userId,
            },
          },
          variant: {
            connect: {
              id: ownership.variantId,
            },
          },
        },
      });
    }
  }
}

main();
