import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Where-fragment for the citizens that are not deleted. Every query that
 * lists, picks, searches, counts, notifies or pays citizens uses it (see the
 * soft delete on `Citizen.deletedAt`).
 */
export const ACTIVE_CITIZEN_WHERE = {
  deletedAt: null,
} as const satisfies Prisma.CitizenWhereInput;
