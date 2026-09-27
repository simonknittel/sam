import type { Prisma } from "@sam-monorepo/database/client";

/**
 * One log row of the note and identity tables. Both tables serialize their
 * rows into client components, so the citizen is joined as {id, handle} and
 * the authors by name alone. A full `User` row here would put every user's
 * email address in a browser payload: the global `omit` covers the OAuth
 * tokens, not the email.
 */
export const CITIZEN_LOG_TABLE_SELECT = {
  id: true,
  citizenId: true,
  type: true,
  content: true,
  createdAt: true,
  confirmed: true,
  confirmedAt: true,
  confirmedBy: { select: { name: true } },
  noteTypeId: true,
  noteType: { select: { id: true, name: true } },
  classificationLevelId: true,
  classificationLevel: { select: { id: true, name: true } },
  citizen: { select: { id: true, handle: true, deletedAt: true } },
  submittedBy: { select: { name: true } },
} as const satisfies Prisma.CitizenLogSelect;

export type CitizenLogTableRow = Prisma.CitizenLogGetPayload<{
  select: typeof CITIZEN_LOG_TABLE_SELECT;
}>;

/**
 * One note on a citizen's notes page. Neither the page nor its permission
 * helpers read the author of the note or of its confirmation, so those
 * `User` joins are absent.
 */
export const CITIZEN_NOTE_SELECT = {
  id: true,
  citizenId: true,
  type: true,
  content: true,
  createdAt: true,
  confirmed: true,
  noteTypeId: true,
  classificationLevelId: true,
} as const satisfies Prisma.CitizenLogSelect;

export type CitizenNote = Prisma.CitizenLogGetPayload<{
  select: typeof CITIZEN_NOTE_SELECT;
}>;

/**
 * One log as the spynet API routes guard on it: the identity of the log and
 * the columns their permission checks read.
 */
export const CITIZEN_LOG_GUARD_SELECT = {
  id: true,
  type: true,
  citizenId: true,
  confirmed: true,
  noteTypeId: true,
  classificationLevelId: true,
} as const satisfies Prisma.CitizenLogSelect;
