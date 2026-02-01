import { prisma } from "@sam-monorepo/database";

async function main() {
  await prisma.fleetOwnership.deleteMany();
}

main();
