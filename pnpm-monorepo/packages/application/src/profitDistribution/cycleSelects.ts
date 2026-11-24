import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";

export const CYCLE_PHASE_SELECT = {
  collectionEndedAt: true,
  payoutStartedAt: true,
  payoutEndedAt: true,
} as const satisfies Prisma.ProfitDistributionCycleSelect;

/**
 * `auecProfit` stays a BigInt: the page calls `toLocaleString()` on it, and
 * React serializes a BigInt
 */
const CYCLE_COLUMNS_SELECT = {
  ...CYCLE_PHASE_SELECT,
  id: true,
  title: true,
  collectionEndsAt: true,
  payoutEndsAt: true,
  auecProfit: true,
} as const satisfies Prisma.ProfitDistributionCycleSelect;

const PARTICIPANT_STATE_SELECT = {
  citizenId: true,
  silcBalanceSnapshot: true,
  cededAt: true,
  acceptedAt: true,
  disbursedAt: true,
} as const satisfies Prisma.ProfitDistributionCycleParticipantSelect;

export const CYCLE_EXCERPT_SELECT = {
  ...CYCLE_COLUMNS_SELECT,
  participants: { select: PARTICIPANT_STATE_SELECT },
} as const satisfies Prisma.ProfitDistributionCycleSelect;

export type CycleExcerptRow = Prisma.ProfitDistributionCycleGetPayload<{
  select: typeof CYCLE_EXCERPT_SELECT;
}>;

export const CYCLE_DETAILS_SELECT = {
  ...CYCLE_COLUMNS_SELECT,
  participants: {
    select: {
      ...PARTICIPANT_STATE_SELECT,
      citizen: {
        select: { ...CITIZEN_REFERENCE_SELECT, silcBalance: true },
      },
      disbursedBy: {
        select: CITIZEN_REFERENCE_SELECT,
      },
    },
  },
} as const satisfies Prisma.ProfitDistributionCycleSelect;

export type CycleDetailsRow = Prisma.ProfitDistributionCycleGetPayload<{
  select: typeof CYCLE_DETAILS_SELECT;
}>;
