import type { Prisma } from "@sam-monorepo/database/client";
import { OnSiteNotificationTab } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema, paginateByDatabaseCursor } from "../pagination.js";

const ON_SITE_NOTIFICATION_PAGE_SIZE = 25;

export const listOwnOnSiteNotificationsInputSchema = z.object({
  tab: z.enum(OnSiteNotificationTab),
  cursor: idSchema.nullish(),
});

export type ListOwnOnSiteNotificationsInput = z.output<
  typeof listOwnOnSiteNotificationsInputSchema
>;

const ON_SITE_NOTIFICATION_LIST_ITEM_SELECT = {
  id: true,
  citizenId: true,
  notificationType: true,
  payload: true,
  payloadVersion: true,
  createdAt: true,
  readAt: true,
  archivedAt: true,
} satisfies Prisma.OnSiteNotificationSelect;

/**
 * The client validates the payload against the schema of its type and version,
 * the same as for a realtime event
 */
export interface OnSiteNotificationListItem {
  readonly id: string;
  readonly citizenId: string;
  readonly notificationType: string;
  readonly payload: Prisma.JsonValue;
  readonly payloadVersion: number;
  readonly createdAt: Date;
  readonly readAt: Date | null;
  readonly archivedAt: Date | null;
}

export interface OnSiteNotificationListPage {
  readonly items: OnSiteNotificationListItem[];
  readonly nextCursor: string | null;
}

const getArchivedAtFilter = (
  tab: OnSiteNotificationTab,
): Prisma.OnSiteNotificationWhereInput["archivedAt"] => {
  switch (tab) {
    case OnSiteNotificationTab.Inbox:
      return null;

    case OnSiteNotificationTab.Archive:
      return { not: null };

    default:
      throw new Error(
        `Unknown on-site notification tab: ${tab satisfies never}`,
      );
  }
};

export const listOwnOnSiteNotifications = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListOwnOnSiteNotificationsInput,
): Promise<OnSiteNotificationListPage> => {
  const citizenId = requireCitizen(actor).id;

  const page = await paginateByDatabaseCursor(
    { cursor: input.cursor, pageSize: ON_SITE_NOTIFICATION_PAGE_SIZE },
    (cursorArguments) =>
      context.prisma.onSiteNotification.findMany({
        where: {
          citizenId,
          archivedAt: getArchivedAtFilter(input.tab),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: ON_SITE_NOTIFICATION_LIST_ITEM_SELECT,
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.onSiteNotification.count({
        where: { id, citizenId },
      })) > 0,
  );

  return { items: page.items, nextCursor: page.nextCursor };
};
