import { prisma } from "@sam-monorepo/database";

async function main() {
  const entities = await prisma.citizen.findMany({
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
    await prisma.citizen.update({
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
        citizenRecord: entity.logs
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
