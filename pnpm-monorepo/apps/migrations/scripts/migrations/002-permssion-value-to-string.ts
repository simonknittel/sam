/**
 * ```bashrc
 * DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" npx tsx ./scripts/migrations/002-permssion-value-to-string.ts
 * ```
 */

import { prisma } from "@sam-monorepo/database";

async function main() {
  await prisma.permission.updateMany({
    data: {
      value: "true",
    },
  });
}

main();
