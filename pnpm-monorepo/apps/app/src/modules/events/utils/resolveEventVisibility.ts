import {
  EventVisibility,
  type Entity,
  type Event,
  type EventVisibilityRole,
} from "@sam-monorepo/database/client";

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
  readonly managers: readonly Pick<Entity, "id">[];
};

/**
 * Whether a viewer may see an event. The single source of truth for event
 * visibility, mirrored by `getVisibleEventsWhere()` for list queries:
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
