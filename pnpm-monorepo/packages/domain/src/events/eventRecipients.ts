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
 * Excludes the citizens who cannot see the event. A superset: the
 * permission-string join cannot express the role levels, thus the
 * `resolveEventVisibility()` of the application package remains the
 * authoritative gate. The roles are expanded one level through the inheritance
 * relation, mirroring `resolveEffectiveRoles`.
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
 * Only an approximation of the clearance: it ignores the inherited roles, the
 * level gate, the negation and the conditions of the user. The notification
 * router uses the effective permissions instead (`findClearedCitizens()` of the
 * application package).
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

/** Only an approximation, with the limits of `CAN_LOGIN_CITIZEN_WHERE` */
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
