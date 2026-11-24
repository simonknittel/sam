import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export interface AuditEventCreator {
  readonly id: string;
  readonly name: string | null;
}

export const listAuditEventCreators = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<AuditEventCreator[]> => {
  requirePermission(actor, "systemLog", "read");

  // A query on the users with an event, not a `distinct` on the events:
  // without the `nativeDistinct` preview feature, Prisma removes the
  // duplicates after it reads all events
  const users = await context.prisma.user.findMany({
    where: { createdAuditEvents: { some: {} } },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return users;
};
