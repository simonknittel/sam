import { prisma } from "@sam-monorepo/database";

async function main() {
  await prisma.permission.updateMany({
    data: {
      value: "true",
    },
  });
}

main();
