import { prisma } from "@/db";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  type Citizen,
  type Organization,
  type Prisma,
} from "@sam-monorepo/database/client";

/**
 * Writes a change to the membership history of a citizen. The active
 * memberships come from the confirmed history entries, thus the same
 * transaction replays them. Use this function for each write to the
 * membership history.
 */
/**
 * Thrown inside the callback of `changeMembershipHistory()` to reject a
 * change. It rolls the transaction back, thus the rejected change writes
 * nothing. The message is the answer to the user.
 */
export class RejectedChangeError extends Error {}

export const changeMembershipHistory = async <Result>(
  citizenId: Citizen["id"],
  change: (transaction: Prisma.TransactionClient) => Promise<Result>,
) =>
  prisma.$transaction(async (transaction) => {
    /**
     * Two changes of the same citizen at the same time must replay one after
     * the other. Else a replay does not see the other change, and the active
     * memberships stay incorrect.
     */
    await transaction.$queryRaw`SELECT 1 FROM "Citizen" WHERE "id" = ${citizenId} FOR NO KEY UPDATE`;

    const result = await change(transaction);
    await replayActiveMemberships(transaction, citizenId);
    return result;
  });

const replayActiveMemberships = async (
  transaction: Prisma.TransactionClient,
  citizenId: Citizen["id"],
) => {
  const confirmedHistoryEntries =
    await transaction.organizationMembershipHistoryEntry.findMany({
      where: {
        citizenId,
        confirmed: ConfirmationStatus.CONFIRMED,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        organizationId: true,
        type: true,
        visibility: true,
      },
    });

  const activeMemberships = new Map<
    Organization["id"],
    Prisma.ActiveOrganizationMembershipCreateManyInput
  >();

  for (const entry of confirmedHistoryEntries) {
    switch (entry.type) {
      case OrganizationMembershipType.MAIN:
      case OrganizationMembershipType.AFFILIATE:
        activeMemberships.set(entry.organizationId, {
          organizationId: entry.organizationId,
          citizenId,
          type: entry.type,
          visibility: entry.visibility,
        });
        break;

      /**
       * LEFT only ends a membership. A CHECK constraint refuses it in the
       * active memberships.
       */
      case OrganizationMembershipType.LEFT:
        activeMemberships.delete(entry.organizationId);
        break;

      default:
        throw new Error(
          `Unknown membership type: ${entry.type satisfies never}`,
        );
    }
  }

  await transaction.activeOrganizationMembership.deleteMany({
    where: {
      citizenId,
    },
  });

  await transaction.activeOrganizationMembership.createMany({
    data: Array.from(activeMemberships.values()),
  });
};
