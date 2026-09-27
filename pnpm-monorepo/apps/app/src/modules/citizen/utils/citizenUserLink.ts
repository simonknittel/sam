import { prisma } from "@/db";
import { log } from "@/modules/logging";
import {
  type Citizen,
  type Prisma,
  type User,
} from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";

/**
 * A citizen belongs to the user whose Discord account has the Discord ID of
 * the citizen. `Citizen.userId` stores this link. These two functions keep
 * it correct at the two moments when it can change.
 */

/**
 * A deleted citizen gets no link: the write skips it, and the result is
 * false. The CHECK constraint `Citizen_deleted_login_check` refuses such a
 * link also for a delete that runs at the same time.
 */
const setCitizenUser = async (
  client: Prisma.TransactionClient,
  citizenId: Citizen["id"],
  userId: User["id"] | null,
) => {
  if (userId)
    await client.citizen.updateMany({
      where: { userId, id: { not: citizenId } },
      data: { userId: null },
    });

  const { count } = await client.citizen.updateMany({
    where: { id: citizenId, ...ACTIVE_CITIZEN_WHERE },
    data: { userId },
  });

  return count > 0;
};

/** At each sign-in, links the user to the citizen of its Discord account */
export const linkCitizenOfSignedInUser = async (
  userId: User["id"],
  discordId: string,
) => {
  const citizen = await prisma.citizen.findFirst({
    where: { discordId, ...ACTIVE_CITIZEN_WHERE },
    select: { id: true },
  });

  if (citizen) {
    const isLinked = await prisma.$transaction((transaction) =>
      setCitizenUser(transaction, citizen.id, userId),
    );
    if (!isLinked)
      log.info(
        "The citizen of a signed-in user was deleted during the sign-in",
        {
          userId,
          citizenId: citizen.id,
        },
      );
    return;
  }

  await prisma.citizen.updateMany({
    where: { userId },
    data: { userId: null },
  });
};

/** After the Discord ID of a citizen changed, links the matching user */
export const relinkCitizenUser = async (
  citizenId: Citizen["id"],
  client: Prisma.TransactionClient,
) => {
  const citizen = await client.citizen.findUniqueOrThrow({
    where: { id: citizenId },
    select: { discordId: true, deletedAt: true },
  });

  const account =
    citizen.discordId && !citizen.deletedAt
      ? await client.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "discord",
              providerAccountId: citizen.discordId,
            },
          },
          select: { userId: true },
        })
      : null;

  await setCitizenUser(client, citizenId, account?.userId ?? null);
};
