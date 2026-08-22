import type {
  Entity,
  Event,
  EventVisibilityRole,
  Prisma,
} from "@sam-monorepo/database/client";
import { EventVisibility } from "@sam-monorepo/database/client";

export type EventRecipientInput = Pick<Event, "visibility" | "createdById"> & {
  readonly visibilityRoles: readonly Pick<EventVisibilityRole, "roleId">[];
  readonly managers: readonly Pick<Entity, "id">[];
};

/**
 * Entity where-fragment excluding citizens who cannot see the event, to be
 * ANDed into every per-citizen event query — notification recipients in the
 * Lambda, addable participants in the app. PUBLIC events restrict nothing.
 * For RESTRICTED events a citizen must hold one of the allowed roles
 * (expanded one level through the inheritance relation, mirroring
 * `resolveEffectiveRoles`), hold `event;manage` through a role, be the
 * creator or be a manager.
 *
 * No role-level gating is applied — the permission-string join cannot
 * express levels; the app's `resolveEventVisibility()` remains the
 * authoritative gate. A leveled role holder below their max level can
 * therefore be offered as a participant while the event page still 404s for
 * them.
 */
export const buildEventRecipientWhere = (
  event: EventRecipientInput,
): Prisma.EntityWhereInput => {
  if (event.visibility === EventVisibility.PUBLIC) return {};

  const allowedRoleIds = event.visibilityRoles.map(
    (visibilityRole) => visibilityRole.roleId,
  );

  const memberIds = [
    ...(event.createdById ? [event.createdById] : []),
    ...event.managers.map((manager) => manager.id),
  ];

  return {
    OR: [
      { id: { in: memberIds } },
      {
        roleAssignments: {
          some: {
            role: {
              OR: [
                { id: { in: allowedRoleIds } },
                { inherits: { some: { id: { in: allowedRoleIds } } } },
                {
                  permissionStrings: {
                    some: { permissionString: "event;manage" },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  };
};

/**
 * Entity where-fragment for citizens who can act on an event at all: they
 * hold both `login;manage` and `event;read` through their roles. Combined
 * with `buildEventRecipientWhere()` this is the reachability rule for event
 * notifications, so nobody gets notified about — or manually added to — an
 * event they can't open.
 */
export const NOTIFIABLE_CITIZEN_WHERE: Prisma.EntityWhereInput = {
  AND: [
    {
      roleAssignments: {
        some: {
          role: {
            permissionStrings: { some: { permissionString: "login;manage" } },
          },
        },
      },
    },
    {
      roleAssignments: {
        some: {
          role: {
            permissionStrings: { some: { permissionString: "event;read" } },
          },
        },
      },
    },
  ],
};
