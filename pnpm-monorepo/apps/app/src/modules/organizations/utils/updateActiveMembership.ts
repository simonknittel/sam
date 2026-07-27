import { prisma } from "@/db";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  type Entity,
  type Organization,
  type OrganizationMembershipHistoryEntry,
} from "@/generated/prisma/client";

export const updateActiveMembership = async (citizenId: Entity["id"]) => {
  /**
   * Figure out currently active memberships
   */
  const confirmedHistoryEntries =
    await prisma.organizationMembershipHistoryEntry.findMany({
      where: {
        citizenId,
        confirmed: ConfirmationStatus.CONFIRMED,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  const activeMemberships = new Map<
    Organization["id"],
    OrganizationMembershipHistoryEntry
  >();

  for (const entry of confirmedHistoryEntries) {
    if (
      [
        OrganizationMembershipType.MAIN,
        OrganizationMembershipType.AFFILIATE,
        // @ts-expect-error Stupid type error
      ].includes(entry.type)
    ) {
      activeMemberships.set(entry.organizationId, entry);
    } else if (entry.type === OrganizationMembershipType.LEFT) {
      activeMemberships.delete(entry.organizationId);
    } else {
      throw new Error("Unknown membership type");
    }
  }

  /**
   * Update database
   */
  await prisma.$transaction([
    prisma.activeOrganizationMembership.deleteMany({
      where: {
        citizenId,
      },
    }),

    prisma.activeOrganizationMembership.createMany({
      data: Array.from(activeMemberships.values()).map((entry) => ({
        organizationId: entry.organizationId,
        citizenId,
        type: entry.type,
        visibility: entry.visibility,
      })),
    }),
  ]);
};
