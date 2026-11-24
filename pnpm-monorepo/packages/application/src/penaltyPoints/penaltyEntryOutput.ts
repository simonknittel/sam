import type { Prisma } from "@sam-monorepo/database/client";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";

export interface PenaltyEntryCitizenOutput {
  readonly id: string;
  /** Null for a deleted citizen: the app does not show its handle */
  readonly handle: string | null;
  readonly deleted_at: string | null;
}

export interface PenaltyEntryOutput {
  readonly id: string;
  readonly citizen: PenaltyEntryCitizenOutput;
  readonly points: number;
  readonly reason: string | null;
  readonly created_at: string;
  /** Null when the author is not known */
  readonly created_by: PenaltyEntryCitizenOutput | null;
  /** Null for an entry that never expires */
  readonly expires_at: string | null;
  readonly deleted_at: string | null;
}

/** The columns of a penalty entry for `toPenaltyEntryOutput()` */
export const PENALTY_ENTRY_SELECT = {
  id: true,
  points: true,
  reason: true,
  createdAt: true,
  expiresAt: true,
  deletedAt: true,
  citizen: { select: CITIZEN_REFERENCE_SELECT },
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.PenaltyEntrySelect;

const toCitizenOutput = (
  citizen: CitizenReferenceRow,
): PenaltyEntryCitizenOutput => ({
  id: citizen.id,
  handle: citizen.deletedAt ? null : citizen.handle,
  deleted_at: citizen.deletedAt?.toISOString() ?? null,
});

/** A penalty entry in the outputs of the list and of the writes */
export const toPenaltyEntryOutput = (
  entry: Prisma.PenaltyEntryGetPayload<{ select: typeof PENALTY_ENTRY_SELECT }>,
): PenaltyEntryOutput => ({
  id: entry.id,
  citizen: toCitizenOutput(entry.citizen),
  points: entry.points,
  reason: entry.reason,
  created_at: entry.createdAt.toISOString(),
  created_by: entry.createdBy && toCitizenOutput(entry.createdBy),
  expires_at: entry.expiresAt?.toISOString() ?? null,
  deleted_at: entry.deletedAt?.toISOString() ?? null,
});
