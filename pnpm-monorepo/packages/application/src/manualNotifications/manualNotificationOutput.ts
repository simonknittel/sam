import type { Prisma } from "@sam-monorepo/database/client";
import {
  CITIZEN_REFERENCE_SELECT,
  toCitizenReference,
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";

export interface ManualNotificationRoleOutput {
  readonly id: string;
  readonly name: string;
}

/** A manual notification in the outputs of the list and of the create use case */
export interface ManualNotificationOutput {
  readonly id: string;
  readonly created_at: string;
  /** Null when the sender is not known or is deleted */
  readonly created_by: CitizenReference | null;
  readonly title: string;
  readonly body: string;
  /** The selected citizens that are not deleted */
  readonly receiver_citizens: CitizenReference[];
  readonly receiver_roles: ManualNotificationRoleOutput[];
}

/** The columns of a manual notification for `toManualNotificationOutput()` */
export const MANUAL_NOTIFICATION_SELECT = {
  id: true,
  createdAt: true,
  title: true,
  body: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  receiverCitizens: {
    select: { citizen: { select: CITIZEN_REFERENCE_SELECT } },
    orderBy: { citizen: { handle: "asc" } },
  },
  receiverRoles: {
    select: { role: { select: { id: true, name: true } } },
    orderBy: { role: { name: "asc" } },
  },
} as const satisfies Prisma.ManualNotificationSelect;

export const toManualNotificationOutput = (
  notification: Prisma.ManualNotificationGetPayload<{
    select: typeof MANUAL_NOTIFICATION_SELECT;
  }>,
): ManualNotificationOutput => ({
  id: notification.id,
  created_at: notification.createdAt.toISOString(),
  created_by: toCitizenReference(notification.createdBy),
  title: notification.title,
  body: notification.body,
  receiver_citizens: toCitizenReferences(
    notification.receiverCitizens.map((receiver) => receiver.citizen),
  ),
  receiver_roles: notification.receiverRoles.map((receiver) => ({
    id: receiver.role.id,
    name: receiver.role.name,
  })),
});
