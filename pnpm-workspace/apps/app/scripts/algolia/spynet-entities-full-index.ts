/**
 * Usage:
 * ```bashrc
 * npm install --global ts-node
 *
 * DATABASE_URL='mysql://************@/:************@aws.connect.psdb.cloud/db?sslaccept=strict' ALGOLIA_APP_ID='' ALGOLIA_ADMIN_API_KEY='' ts-node --esm --skipProject ./algolia/spynet-entities-full-index.ts
 * ```
 */

import algoliasearch from "algoliasearch";
import { prisma } from "../prisma";

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!,
);

const index = client.initIndex("spynet_entities");

async function main() {
  await index.clearObjects();

  const entities = await prisma.entity.findMany({
    include: {
      logs: {
        where: {
          OR: [
            {
              type: "handle",
              attributes: {
                some: {
                  key: "confirmed",
                  value: "confirmed",
                },
              },
            },
            {
              type: "citizen-id",
              attributes: {
                some: {
                  key: "confirmed",
                  value: "confirmed",
                },
              },
            },
            {
              type: "community-moniker",
              attributes: {
                some: {
                  key: "confirmed",
                  value: "confirmed",
                },
              },
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const objects = entities.map((entity) => {
    return {
      objectID: entity.id,
      type: "citizen",
      spectrumId: entity.spectrumId,
      handles: entity.logs
        .filter((log) => log.type === "handle")
        .map((log) => log.content),
      citizenIds: entity.logs
        .filter((log) => log.type === "citizen-id")
        .map((log) => log.content),
      communityMonikers: entity.logs
        .filter((log) => log.type === "community-moniker")
        .map((log) => log.content),
    };
  });

  await index.saveObjects(objects);
}

void main();
