// @ts-check

/**
 * ```bashrc
 * pscale connect db development
 * node 002-permission-value-to-string.js
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
