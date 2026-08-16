import { prisma, type Event } from "@sam-monorepo/database";
import { EventVisibility, type Prisma } from "@sam-monorepo/database/client";

/**
 * Entity where-fragment excluding citizens who cannot see the event, to be
 * ANDed into every event notification recipient query. PUBLIC events
 * restrict nothing. For RESTRICTED events a citizen must hold one of the
 * allowed roles (expanded one level through the inheritance relation,
 * mirroring `resolveEffectiveRoles`), hold `event;manage` through a role,
 * be the creator or be a manager.
 *
 * Like the rest of the recipient path, no role-level gating is applied —
 * the permission-string join cannot express levels; the app's 404 remains
 * the authoritative gate.
 *
 * Returns null when the event does not exist.
 */
export const getEventRecipientWhere = async (
  eventId: Event["id"],
): Promise<Prisma.EntityWhereInput | null> => {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      visibility: true,
      createdById: true,
      managers: { select: { id: true } },
      visibilityRoles: { select: { roleId: true } },
    },
  });
  if (!event) return null;
  if (event.visibility === EventVisibility.PUBLIC) return {};

  const allowedRoleIds = new Set(
    event.visibilityRoles.map((visibilityRole) => visibilityRole.roleId),
  );

  const [inheritingRoles, eventManageRoles] = await Promise.all([
    prisma.role.findMany({
      where: {
        inherits: {
          some: { id: { in: Array.from(allowedRoleIds) } },
        },
      },
      select: { id: true },
    }),
    prisma.permissionString.findMany({
      where: { permissionString: "event;manage" },
      select: { roleId: true },
    }),
  ]);
  for (const role of inheritingRoles) allowedRoleIds.add(role.id);
  for (const entry of eventManageRoles) allowedRoleIds.add(entry.roleId);

  const memberIds = [
    ...(event.createdById ? [event.createdById] : []),
    ...event.managers.map((manager) => manager.id),
  ];

  return {
    OR: [
      { id: { in: memberIds } },
      {
        roleAssignments: {
          some: { roleId: { in: Array.from(allowedRoleIds) } },
        },
      },
    ],
  };
};
