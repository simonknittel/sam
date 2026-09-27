import { prisma } from "@/db";
import type { Citizen, User } from "@sam-monorepo/database/client";

/**
 * A citizen belongs to the user whose Discord account has the Discord ID of
 * the citizen. `Citizen.userId` stores this link. These two functions keep
 * it correct at the two moments when it can change.
 */

const setCitizenUser = (citizenId: Citizen["id"], userId: User["id"] | null) =>
  prisma.$transaction([
    ...(userId
      ? [
          prisma.citizen.updateMany({
            where: { userId, id: { not: citizenId } },
            data: { userId: null },
          }),
        ]
      : []),
    prisma.citizen.update({
      where: { id: citizenId },
      data: { userId },
      select: { id: true },
    }),
  ]);

/** At each sign-in, links the user to the citizen of its Discord account */
export const linkCitizenOfSignedInUser = async (
  userId: User["id"],
  discordId: string,
) => {
  const citizen = await prisma.citizen.findUnique({
    where: { discordId },
    select: { id: true },
  });

  if (citizen) {
    await setCitizenUser(citizen.id, userId);
    return;
  }

  await prisma.citizen.updateMany({
    where: { userId },
    data: { userId: null },
  });
};

/** After the Discord ID of a citizen changed, links the matching user */
export const relinkCitizenUser = async (citizenId: Citizen["id"]) => {
  const citizen = await prisma.citizen.findUniqueOrThrow({
    where: { id: citizenId },
    select: { discordId: true },
  });

  const account = citizen.discordId
    ? await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "discord",
            providerAccountId: citizen.discordId,
          },
        },
        select: { userId: true },
      })
    : null;

  await setCitizenUser(citizenId, account?.userId ?? null);
};
