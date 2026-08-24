import type { Prisma } from "@sam-monorepo/database/client";

/**
 * One attribute of a log as the code that decides on it reads it: the key
 * and value it matches on, and the timestamp it picks the latest by.
 */
export const ENTITY_LOG_ATTRIBUTE_VALUE_SELECT = {
  id: true,
  key: true,
  value: true,
  createdAt: true,
} as const satisfies Prisma.EntityLogAttributeSelect;

/**
 * The same, plus the name of whoever set the attribute, which the note and
 * identity tables show in their "confirmed by" column.
 */
export const ENTITY_LOG_ATTRIBUTE_SELECT = {
  ...ENTITY_LOG_ATTRIBUTE_VALUE_SELECT,
  createdBy: { select: { name: true } },
} as const satisfies Prisma.EntityLogAttributeSelect;

/**
 * One log row of the note and identity tables. Both scan every log in the
 * database and filter in memory afterwards, and both serialize their rows
 * into client components — so the citizen is joined as {id, handle} and the
 * authors by name alone. A full `User` row here would put every user's
 * email address in a browser payload: the global `omit` covers the OAuth
 * tokens, not the email.
 *
 * The `attributes` relation stays with each call site, which filters it by
 * key, and uses `ENTITY_LOG_ATTRIBUTE_SELECT`.
 */
export const ENTITY_LOG_TABLE_SELECT = {
  id: true,
  entityId: true,
  type: true,
  content: true,
  createdAt: true,
  entity: { select: { id: true, handle: true } },
  submittedBy: { select: { name: true } },
} as const satisfies Prisma.EntityLogSelect;

/**
 * One note on a citizen's notes page. Neither the page nor its permission
 * helpers read the author of the note or of any of its attributes, so those
 * two `User` joins are absent — they used to ride into the client props of
 * every notes page.
 */
export const CITIZEN_NOTE_SELECT = {
  id: true,
  entityId: true,
  type: true,
  content: true,
  createdAt: true,
  attributes: {
    select: ENTITY_LOG_ATTRIBUTE_VALUE_SELECT,
  },
} as const satisfies Prisma.EntityLogSelect;

export type CitizenNote = Prisma.EntityLogGetPayload<{
  select: typeof CITIZEN_NOTE_SELECT;
}>;

export type EntityLogTableRow = Prisma.EntityLogGetPayload<{
  select: typeof ENTITY_LOG_TABLE_SELECT & {
    attributes: { select: typeof ENTITY_LOG_ATTRIBUTE_SELECT };
  };
}>;

/**
 * One log as the spynet API routes guard on it: the identity of the log and
 * the attributes their permission checks read.
 */
export const ENTITY_LOG_GUARD_SELECT = {
  id: true,
  type: true,
  entityId: true,
  attributes: { select: ENTITY_LOG_ATTRIBUTE_VALUE_SELECT },
} as const satisfies Prisma.EntityLogSelect;
