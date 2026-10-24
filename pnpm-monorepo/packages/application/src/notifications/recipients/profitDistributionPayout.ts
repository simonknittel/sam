import {
  getAuecPerSilc,
  getTotalSilc,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { findCitizenIdsWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

/** The receiver of a payout notification must be able to open the cycle */
const PAYOUT_RECEIVER_PERMISSION_SETS = [
  { resource: "profitDistributionCycle", operation: "read" },
] as const satisfies readonly PermissionSet[];

const findPayoutReceiverIds = (
  context: ApplicationContext,
  citizenIds: readonly string[],
) =>
  findCitizenIdsWithPermissions(
    context,
    { id: { in: [...citizenIds] } },
    PAYOUT_RECEIVER_PERMISSION_SETS,
  );

interface PayoutCycleReference {
  readonly id: string;
  readonly title: string;
}

export interface FindPayoutStartedRecipientsInput {
  readonly cycleId: string;
}

export interface PayoutStartedRecipients {
  readonly cycle: PayoutCycleReference;
  readonly recipients: Recipient[];
}

/**
 * All participants of the cycle who can open the cycle. Null when the cycle
 * does not exist or has no participant.
 */
export const findPayoutStartedRecipients = async (
  context: ApplicationContext,
  input: FindPayoutStartedRecipientsInput,
): Promise<PayoutStartedRecipients | null> => {
  const cycle = await context.prisma.profitDistributionCycle.findUnique({
    where: {
      id: input.cycleId,
    },
    select: {
      id: true,
      title: true,
      participants: {
        select: {
          citizenId: true,
        },
      },
    },
  });
  if (!cycle || cycle.participants.length === 0) return null;

  const receiverIds = await findPayoutReceiverIds(
    context,
    cycle.participants.map((participant) => participant.citizenId),
  );

  return {
    cycle: { id: cycle.id, title: cycle.title },
    recipients: Array.from(receiverIds, (citizenId) => ({ citizenId })),
  };
};

/** One change of the attributes of a participant in the payout phase */
export interface PayoutParticipantChange {
  readonly citizenId: string;
  readonly attribute: string;
  readonly enabled: boolean;
}

export interface FindPayoutDisbursedRecipientsInput {
  readonly cycleId: string;
  readonly changes: readonly PayoutParticipantChange[];
}

export interface PayoutDisbursedRecipient extends Recipient {
  /** The share of the participant in the profit of the cycle */
  readonly auecAmount: number;
}

export interface PayoutDisbursedRecipients {
  readonly cycle: PayoutCycleReference;
  readonly recipients: PayoutDisbursedRecipient[];
}

/**
 * The participants whose `disbursed` attribute the changes enabled, and who
 * can open the cycle. Null when the cycle does not exist or has no
 * participant.
 */
export const findPayoutDisbursedRecipients = async (
  context: ApplicationContext,
  input: FindPayoutDisbursedRecipientsInput,
): Promise<PayoutDisbursedRecipients | null> => {
  const cycle = await context.prisma.profitDistributionCycle.findUnique({
    where: {
      id: input.cycleId,
    },
    select: {
      id: true,
      title: true,
      auecProfit: true,
      participants: {
        select: {
          citizenId: true,
          silcBalanceSnapshot: true,
          cededAt: true,
        },
      },
    },
  });
  if (!cycle || cycle.participants.length === 0) return null;

  const changesWithDisbursedEnabled = input.changes.filter(
    (change) => change.attribute === "disbursed" && change.enabled,
  );
  const participantsWithDisbursedEnabled = cycle.participants.filter(
    (participant) =>
      changesWithDisbursedEnabled.some(
        (change) => change.citizenId === participant.citizenId,
      ),
  );

  const receiverIds = await findPayoutReceiverIds(
    context,
    participantsWithDisbursedEnabled.map(
      (participant) => participant.citizenId,
    ),
  );

  const auecPerSilc = getAuecPerSilc(
    cycle.auecProfit || 0,
    getTotalSilc(cycle.participants),
  );

  return {
    cycle: { id: cycle.id, title: cycle.title },
    recipients: participantsWithDisbursedEnabled
      .filter((participant) => receiverIds.has(participant.citizenId))
      .map((participant) => ({
        citizenId: participant.citizenId,
        auecAmount: (participant.silcBalanceSnapshot || 0) * auecPerSilc,
      })),
  };
};
