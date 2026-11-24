import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_LOG_GUARD_SELECT } from "./citizenLogGuard.js";

/**
 * Neither the notes page nor its permission helpers read the author of the note
 * or of its confirmation, thus these `User` joins are absent
 */
export const CITIZEN_NOTE_SELECT = {
  ...CITIZEN_LOG_GUARD_SELECT,
  createdAt: true,
} as const satisfies Prisma.CitizenLogSelect;

export type CitizenNoteRow = Prisma.CitizenLogGetPayload<{
  select: typeof CITIZEN_NOTE_SELECT;
}>;
