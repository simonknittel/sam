import { prisma } from "@/db";
import { lockCitizen } from "@/modules/citizen/utils/lockCitizen";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  type Citizen,
  type Organization,
  type Prisma,
} from "@sam-monorepo/database/client";

/**
 * Thrown inside the callback of `changeMembershipHistory()` to reject a
 * change. It rolls the transaction back, thus the rejected change writes
 * nothing. The constructor makes the message necessary, because it is the
 * error for the user.
 */
export class RejectedChangeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Writes a change to the membership history of a citizen. The active
 * memberships come from the confirmed history entries, thus the same
 * transaction replays them. Use this function for each write to the
 * membership history.
 *
 * Returns the message of a `RejectedChangeError` of the change, or null
 * after a written change.
 */
export const changeMembershipHistory = async (
  citizenId: Citizen["id"],
  change: (transaction: Prisma.TransactionClient) => Promise<void>,
): Promise<string | null> => {
  try {
    await prisma.$transaction(async (transaction) => {
      /**
       * Else a replay does not see a parallel change, and the active
       * memberships stay incorrect.
       */
      await lockCitizen(transaction, citizenId);

      await change(transaction);
      await replayActiveMemberships(transaction, citizenId);
    });
  } catch (error) {
    if (error instanceof RejectedChangeError) return error.message;
    throw error;
  }

  return null;
};

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
