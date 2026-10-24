// See buildBriefingRootPageSeed: enum values come from the browser-safe
// entry so the Prisma runtime stays out of client bundles. The type-only
// imports below are erased, so they may use the full client entry.
import { EventVisibility } from "@sam-monorepo/database/browser";
import type {
  Citizen,
  Event,
  EventVisibilityRole,
  Prisma,
} from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "../citizen/activeCitizen.js";

export type EventRecipientInput = Pick<Event, "visibility" | "createdById"> & {
  readonly visibilityRoles: readonly Pick<EventVisibilityRole, "roleId">[];
  readonly managers: readonly Pick<Citizen, "id">[];
};

/**
 * Citizen where-fragment excluding citizens who cannot see the event, to be
 * ANDed into a per-citizen event query (the addable participants of the
 * app). PUBLIC events restrict nothing.
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
): Prisma.CitizenWhereInput => {
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
 * Citizen where-fragment for citizens who are not deleted and hold
 * `login;manage` through a directly assigned role. Only an approximation of
 * the clearance: it ignores the inherited roles, the level gate, the
 * negation and the conditions of the user. The notification router uses the
 * effective permissions instead (`findClearedCitizens()` of the application
 * package).
 */
export const CAN_LOGIN_CITIZEN_WHERE: Prisma.CitizenWhereInput = {
  ...ACTIVE_CITIZEN_WHERE,
  roleAssignments: {
    some: {
      role: {
        permissionStrings: { some: { permissionString: "login;manage" } },
      },
    },
  },
};

/**
 * Citizen where-fragment for citizens who hold both `login;manage` and
 * `event;read` through directly assigned roles. Only an approximation, with
 * the limits of `CAN_LOGIN_CITIZEN_WHERE`: the addable participants use it as
 * a prefilter and decide with the effective roles. The event notifications
 * do not use it (see `findEventRecipients()` of the application package).
 */
export const NOTIFIABLE_CITIZEN_WHERE: Prisma.CitizenWhereInput = {
  AND: [
    CAN_LOGIN_CITIZEN_WHERE,
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
