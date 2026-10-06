import { prisma } from "@/db";
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
 * At each sign-in, links the user to the citizen of its Discord account. The
 * writes compare the Discord ID of each citizen themselves, not a read
 * before them. Thus a parallel change of the Discord ID of a citizen, for
 * example the delete of its confirmed Discord ID log, cannot leave a link
 * that does not agree with it.
 */
export const linkCitizenOfSignedInUser = async (
  userId: User["id"],
  discordId: string,
) => {
  await prisma.$transaction([
    prisma.citizen.updateMany({
      where: {
        userId,
        OR: [{ discordId: null }, { discordId: { not: discordId } }],
      },
      data: { userId: null },
    }),
    /**
     * Only one active citizen can have the Discord ID. A deleted citizen gets
     * no link, and the CHECK constraint `Citizen_deleted_login_check` refuses
     * such a link also for a delete that runs at the same time.
     */
    prisma.citizen.updateMany({
      where: { discordId, ...ACTIVE_CITIZEN_WHERE },
      data: { userId },
    }),
  ]);
};

/**
 * After the Discord ID of a citizen changed, links the matching user. Call
 * it in the transaction of the change, after `lockCitizen`.
 */
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
  const userId = account?.userId ?? null;

  /** A user has one citizen at most */
  if (userId)
    await client.citizen.updateMany({
      where: { userId, id: { not: citizenId } },
      data: { userId: null },
    });

  await client.citizen.update({
    where: { id: citizenId },
    data: { userId },
    select: { id: true },
  });
};
