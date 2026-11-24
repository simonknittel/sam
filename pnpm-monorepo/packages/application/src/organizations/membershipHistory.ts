import {
  ConfirmationStatus,
  OrganizationMembershipType,
} from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { lockCitizen } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * The active memberships come from the confirmed history entries, thus the same
 * transaction replays them. Use this function for each write to the membership
 * history.
 */
export const changeMembershipHistory = (
  context: Pick<ApplicationContext, "prisma">,
  citizenId: string,
  change: (transaction: Prisma.TransactionClient) => Promise<void>,
): Promise<void> =>
  context.prisma.$transaction(async (transaction) => {
    /**
     * Else a replay does not see a parallel change, and the active
     * memberships stay incorrect.
     */
    await lockCitizen(transaction, citizenId);

    await change(transaction);
    await replayActiveMemberships(transaction, citizenId);
  });

const replayActiveMemberships = async (
  transaction: Prisma.TransactionClient,
  citizenId: string,
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
    string,
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
