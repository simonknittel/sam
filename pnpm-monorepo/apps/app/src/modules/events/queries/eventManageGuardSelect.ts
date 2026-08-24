import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Exactly what the event management guard decides on: the freeze window
 * (`isEventUpdatable`) and the manage tier (`isAllowedToManageEvent` /
 * `isAllowedToManagePositions`). Modeled on the select in
 * `authorizeEventContainer()`, which already had it right.
 *
 * Actions that need more than the guard spread this and add their own
 * fields, so no guard call site has to fetch full manager Entity rows again.
 */
export const EVENT_MANAGE_GUARD_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  discordCreatorId: true,
  createdById: true,
  managers: { select: { id: true } },
} as const satisfies Prisma.EventSelect;
