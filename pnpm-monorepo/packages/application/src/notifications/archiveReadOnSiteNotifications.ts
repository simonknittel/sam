import { AuditEventType } from "@sam-monorepo/domain";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export interface ArchiveReadOnSiteNotificationsOutput {
  readonly count: number;
}

export const archiveReadOnSiteNotifications = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<ArchiveReadOnSiteNotificationsOutput> => {
  const citizenId = requireCitizen(actor).id;

  const { count } = await context.prisma.onSiteNotification.updateMany({
    where: {
      citizenId,
      readAt: { not: null },
      archivedAt: null,
    },
    data: {
      archivedAt: context.now(),
    },
  });

  if (count > 0)
    await context.audit.create([
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
        data: {
          citizenId,
          count,
        },
        createdById: actor.userId,
      },
    ]);

  return { count };
};
