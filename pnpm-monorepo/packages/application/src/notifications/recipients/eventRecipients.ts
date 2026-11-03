import type { Prisma } from "@sam-monorepo/database/client";
import {
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { findCitizensWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import {
  resolveEventVisibility,
  type EventVisibilityInput,
} from "../../events/eventVisibility.js";
import type { Recipient } from "./recipient.js";

/** The recipients of a notification about an event */
export interface EventNotificationRecipients {
  readonly event: { readonly id: string; readonly name: string };
  readonly recipients: Recipient[];
}

/** The fields of an event that `findEventRecipients()` reads */
export const EVENT_RECIPIENT_SELECT = {
  visibility: true,
  createdById: true,
  deletedAt: true,
  managers: { select: { id: true } },
  visibilityRoles: { select: { roleId: true } },
} as const satisfies Prisma.EventSelect;

const EVENT_RECIPIENT_PERMISSION_SETS = [
  LOGIN_MANAGE_PERMISSION_SET,
  { resource: "event", operation: "read" },
] as const satisfies readonly PermissionSet[];

const EVENT_MANAGE_PERMISSION_SET = {
  resource: "event",
  operation: "manage",
} as const satisfies PermissionSet;

export interface EventRecipientOptions {
  /** The citizen who caused the notification gets none */
  readonly excludedCitizenId?: string | null;
  /**
   * The permissions of the page that the notification links to, in addition
   * to the permissions of the event page. For example, the lineup page also
   * needs `ship;read`.
   */
  readonly additionalPermissionSets?: readonly PermissionSet[];
}

/**
 * The citizens of `where` who can see the event now: the effective
 * `login;manage` and `event;read`, and `resolveEventVisibility()` with the
 * effective roles. This is the same rule as the event page of the app.
 */
export const findEventRecipients = async (
  context: ApplicationContext,
  event: EventVisibilityInput,
  where: Prisma.CitizenWhereInput,
  {
    excludedCitizenId = null,
    additionalPermissionSets = [],
  }: EventRecipientOptions = {},
): Promise<Recipient[]> => {
  const citizens = await findCitizensWithPermissions(
    context,
    excludedCitizenId === null
      ? where
      : { AND: [where, { id: { not: excludedCitizenId } }] },
    [...EVENT_RECIPIENT_PERMISSION_SETS, ...additionalPermissionSets],
  );

  return Array.from(citizens)
    .filter(([citizenId, { roleIds, permissionSets }]) =>
      resolveEventVisibility(event, {
        citizenId,
        roleIds,
        hasEventManage: comparePermissionSets(
          EVENT_MANAGE_PERMISSION_SET,
          permissionSets,
        ),
      }),
    )
    .map(([citizenId]) => ({ citizenId }));
};
