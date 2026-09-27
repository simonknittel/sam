import { prisma } from "@/db";
import type { Citizen } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";

export const INACTIVE_RECEIVER_ERROR =
  "Mindestens ein Citizen existiert nicht oder ist gelöscht.";

/**
 * A new booking goes only to citizens that are not deleted: all lists hide a
 * deleted citizen, thus nobody could see the booking. The ledger keeps the
 * bookings that a citizen got before the delete.
 */
export const areActiveReceivers = async (
  receiverIds: readonly Citizen["id"][],
) => {
  const uniqueReceiverIds = [...new Set(receiverIds)];
  const activeCount = await prisma.citizen.count({
    where: { id: { in: uniqueReceiverIds }, ...ACTIVE_CITIZEN_WHERE },
  });

  return activeCount === uniqueReceiverIds.length;
};
