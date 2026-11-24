import type { Prisma } from "@sam-monorepo/database/client";
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

const findRecipientOfPenaltyEntry = async (
  context: ApplicationContext,
  where: Prisma.PenaltyEntryWhereUniqueInput,
): Promise<PenaltyEntryRecipients | null> => {
  const penaltyEntry = await context.prisma.penaltyEntry.findUnique({
    where,
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

export const findPenaltyEntryRecipient = (
  context: ApplicationContext,
  input: FindPenaltyEntryRecipientInput,
) => findRecipientOfPenaltyEntry(context, { id: input.penaltyEntryId });

/**
 * A deleted entry does not exist for the citizen any more, thus it gives no
 * notification
 */
export const findPenaltyEntryExpiredRecipient = (
  context: ApplicationContext,
  input: FindPenaltyEntryRecipientInput,
) =>
  findRecipientOfPenaltyEntry(context, {
    id: input.penaltyEntryId,
    deletedAt: null,
  });
