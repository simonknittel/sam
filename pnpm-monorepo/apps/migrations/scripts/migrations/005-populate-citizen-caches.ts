/**
 * Usage:
 * ```bashrc
 * npm install --global ts-node
 *
 * ts-node --esm --skipProject ./migrations/005-populate-citizen-caches.ts
 *
 * DATABASE_URL='mysql://************@/:************@aws.connect.psdb.cloud/db?sslaccept=strict' ts-node --esm --skipProject ./migrations/005-populate-citizen-caches.ts
 * ```
 */

import { prisma } from "@sam-monorepo/database";

async function main() {
  const entities = await prisma.entity.findMany({
    include: {
      logs: {
        where: {
          type: {
            in: [
              "spectrum-id",
              "handle",
              "discord-id",
              "teamspeak-id",
              "citizen-id",
              "community-moniker",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          attributes: true,
        },
      },
    },
  });

  for (const entity of entities) {
    await prisma.entity.update({
      where: {
        id: entity.id,
      },
      data: {
        spectrumId: entity.logs.find((log) => log.type === "spectrum-id")
          ?.content,
        handle: entity.logs
          .filter((log) =>
            log.attributes.find(
              (attribute) =>
                attribute.key === "confirmed" &&
                attribute.value === "confirmed",
            ),
          )
          .find((log) => log.type === "handle")?.content,
        discordId: entity.logs
          .filter((log) =>
            log.attributes.find(
              (attribute) =>
                attribute.key === "confirmed" &&
                attribute.value === "confirmed",
            ),
          )
          .find((log) => log.type === "discord-id")?.content,
        teamspeakId: entity.logs
          .filter((log) =>
            log.attributes.find(
              (attribute) =>
                attribute.key === "confirmed" &&
                attribute.value === "confirmed",
            ),
          )
          .find((log) => log.type === "teamspeak-id")?.content,
        citizenId: entity.logs
          .filter((log) =>
            log.attributes.find(
              (attribute) =>
                attribute.key === "confirmed" &&
                attribute.value === "confirmed",
            ),
          )
          .find((log) => log.type === "citizen-id")?.content,
        communityMoniker: entity.logs
          .filter((log) =>
            log.attributes.find(
              (attribute) =>
                attribute.key === "confirmed" &&
                attribute.value === "confirmed",
            ),
          )
          .find((log) => log.type === "community-moniker")?.content,
      },
    });
  }
}

void main().then(() => console.info("Finished."));
