/**
 * Usage:
 * ```bashrc
 * npm install --global ts-node
 *
 * ts-node --esm --skipProject ./migrations/006-populate-citizen-roles-cache.ts
 *
 * DATABASE_URL='mysql://************@/:************@aws.connect.psdb.cloud/db?sslaccept=strict' ts-node --esm --skipProject ./migrations/006-populate-citizen-roles-cache.ts
 * ```
 */

import { prisma } from "@sam-monorepo/database";

async function main() {
  const entities = await prisma.entity.findMany({
    include: {
      logs: {
        where: {
          type: {
            in: ["role-added", "role-removed"],
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  for (const entity of entities) {
    const assignedRoles = new Set<string>();

    for (const log of entity.logs) {
      if (!log.content) continue;

      if (log.type === "role-added") {
        assignedRoles.add(log.content);
      } else if (log.type === "role-removed") {
        assignedRoles.delete(log.content);
      }
    }

    await prisma.entity.update({
      where: {
        id: entity.id,
      },
      data: {
        roles: Array.from(assignedRoles).join(","),
      },
    });
  }
}

void main().then(() => console.info("Finished."));
