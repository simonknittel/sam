import { prisma } from "@sam-monorepo/database";

async function main() {
  await prisma.$transaction([
    prisma.citizenLog.updateMany({
      data: {
        type: "discord-id",
      },
      where: {
        type: "discordId",
      },
    }),
    prisma.citizenLog.updateMany({
      data: {
        type: "teamspeak-id",
      },
      where: {
        type: "teamspeakId",
      },
    }),
    prisma.citizenLog.updateMany({
      data: {
        type: "community-moniker",
      },
      where: {
        type: "communityMoniker",
      },
    }),
    prisma.citizenLogAttribute.updateMany({
      data: {
        value: "false-report",
      },
      where: {
        value: "falseReport",
      },
    }),
    prisma.permission.updateMany({
      data: {
        resource: "discord-id",
      },
      where: {
        resource: "discordId",
      },
    }),
    prisma.permission.updateMany({
      data: {
        resource: "teamspeak-id",
      },
      where: {
        resource: "teamspeakId",
      },
    }),
    prisma.permission.updateMany({
      data: {
        resource: "citizen-id",
      },
      where: {
        resource: "citizenId",
      },
    }),
    prisma.permission.updateMany({
      data: {
        resource: "community-moniker",
      },
      where: {
        resource: "communityMoniker",
      },
    }),
  ]);
}

void main().then(() => console.info("Finished."));
