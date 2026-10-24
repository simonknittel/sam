import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindPenaltyEntryRecipientInput {
  readonly penaltyEntryId: string;
}

export interface PenaltyEntryRecipients {
  readonly penaltyEntry: {
    readonly points: number;
    readonly reason: string | null;
  };
  readonly recipients: Recipient[];
}

/**
 * The citizen of the penalty entry, when the citizen can log in and read the
 * own penalty entries. Null when the penalty entry does not exist.
 */
export const findPenaltyEntryRecipient = async (
  context: ApplicationContext,
  input: FindPenaltyEntryRecipientInput,
): Promise<PenaltyEntryRecipients | null> => {
  const penaltyEntry = await context.prisma.penaltyEntry.findUnique({
    where: {
      id: input.penaltyEntryId,
    },
    select: {
      points: true,
      reason: true,
      citizenId: true,
    },
  });
  if (!penaltyEntry) return null;

  const isRecipient = await isCitizenWithPermissions(
    context,
    penaltyEntry.citizenId,
    [
      LOGIN_MANAGE_PERMISSION_SET,
      { resource: "ownPenaltyEntry", operation: "read" },
    ],
  );

  return {
    penaltyEntry: { points: penaltyEntry.points, reason: penaltyEntry.reason },
    recipients: isRecipient ? [{ citizenId: penaltyEntry.citizenId }] : [],
  };
};
