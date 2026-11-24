import { EventVisibility } from "@sam-monorepo/database/browser";
import type {
  Citizen,
  Event,
  EventVisibilityRole,
  Prisma,
} from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";

export interface EventViewer {
  readonly citizenId: string | null;
  readonly roleIds: ReadonlySet<string>;
  readonly hasEventManage: boolean;
}

export type EventVisibilityInput = Pick<
  Event,
  "visibility" | "createdById" | "deletedAt"
> & {
  readonly visibilityRoles: readonly Pick<EventVisibilityRole, "roleId">[];
  readonly managers: readonly Pick<Citizen, "id">[];
};

/**
 * Whether a viewer may see an event. The single source of truth for event
 * visibility, mirrored by `buildVisibleEventsWhere()` for list queries:
 * soft-deleted events are invisible to everyone (no trash UI), PUBLIC events
 * are visible to every `event;read` holder (callers check that permission),
 * RESTRICTED events only to holders of a selected role plus the fixed
 * bypass tier of creator, managers and `event;manage`.
 */
export const resolveEventVisibility = (
  event: EventVisibilityInput,
  viewer: EventViewer,
): boolean => {
  if (event.deletedAt !== null) return false;

  if (viewer.hasEventManage) return true;

  if (event.visibility === EventVisibility.PUBLIC) return true;

  if (viewer.citizenId !== null) {
    if (event.createdById === viewer.citizenId) return true;

    if (event.managers.some((manager) => manager.id === viewer.citizenId))
      return true;
  }

  return event.visibilityRoles.some((visibilityRole) =>
    viewer.roleIds.has(visibilityRole.roleId),
  );
};

/**
 * Every event list query must AND this in so no call site can forget the
 * soft-delete or visibility exclusion
 */
export const buildVisibleEventsWhere = (
  viewer: EventViewer,
): Prisma.EventWhereInput => {
  if (viewer.hasEventManage) return { deletedAt: null };

  const memberConditions: Prisma.EventWhereInput[] =
    viewer.citizenId !== null
      ? [
          { createdById: viewer.citizenId },
          { managers: { some: { id: viewer.citizenId } } },
        ]
      : [];

  return {
    deletedAt: null,
    OR: [
      { visibility: EventVisibility.PUBLIC },
      {
        visibilityRoles: {
          some: { roleId: { in: Array.from(viewer.roleIds) } },
        },
      },
      ...memberConditions,
    ],
  };
};

export const toEventViewer = (actor: Actor): EventViewer => ({
  citizenId: actor.citizen?.id ?? null,
  roleIds: actor.roleIds,
  hasEventManage: actor.authorize("event", "manage"),
});

/**
 * Callers treat a `false` as "does not exist" so restricted events stay fully
 * invisible
 */
export const canActorSeeEvent = (
  actor: Actor,
  event: EventVisibilityInput,
): boolean => resolveEventVisibility(event, toEventViewer(actor));
