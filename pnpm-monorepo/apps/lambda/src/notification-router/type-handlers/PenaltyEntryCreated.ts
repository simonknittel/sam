import { prisma, type PenaltyEntry } from "@sam-monorepo/database";
import { findCitizenIdsWithPermissions } from "../../common/effectivePermissions";
import { publishNotifications } from "../publish";

interface Payload {
  penaltyEntryId: PenaltyEntry["id"];
}

export const PenaltyEntryCreatedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const penaltyEntry = await prisma.penaltyEntry.findUnique({
    where: {
      id: payload.penaltyEntryId,
    },
    select: {
      id: true,
      points: true,
      reason: true,
      citizenId: true,
    },
  });
  if (!penaltyEntry) return;

  const recipientIds = await findCitizenIdsWithPermissions(
    { id: penaltyEntry.citizenId },
    [
      { resource: "login", operation: "manage" },
      { resource: "ownPenaltyEntry", operation: "read" },
    ],
  );
  if (!recipientIds.has(penaltyEntry.citizenId)) return;

  /**
   * Publish notifications
   */
  await publishNotifications([
    {
      receiverId: penaltyEntry.citizenId,
      notificationType: "penalty_entry_created" as const,
      payload: { points: penaltyEntry.points, reason: penaltyEntry.reason },
      title: "Strafpunkte erhalten",
      body: `Du hast ${penaltyEntry.points} Strafpunkte erhalten für ${penaltyEntry.reason}`,
    },
  ]);
};
