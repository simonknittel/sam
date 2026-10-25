import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByDatabaseCursor,
} from "../pagination.js";

export enum MyNotificationReadFilter {
  Unread = "unread",
  Read = "read",
  All = "all",
}

export enum MyNotificationArchivedFilter {
  /** The inbox of the notification center */
  No = "no",
  /** The archive of the notification center */
  Yes = "yes",
  All = "all",
}

export const listMyNotificationsInputSchema = z.object({
  read: z
    .enum(MyNotificationReadFilter)
    .default(MyNotificationReadFilter.Unread)
    .describe(
      "unread: only the unread notifications. read: only the read notifications. all: both.",
    ),
  archived: z
    .enum(MyNotificationArchivedFilter)
    .default(MyNotificationArchivedFilter.No)
    .describe(
      "no: only the notifications of the inbox. yes: only the archived notifications. all: both.",
    ),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListMyNotificationsInput = z.output<
  typeof listMyNotificationsInputSchema
>;

export interface MyNotificationOutput {
  readonly id: string;
  readonly type: string;
  readonly payload: Prisma.JsonValue;
  readonly created_at: string;
  readonly read_at: string | null;
  readonly archived_at: string | null;
}

export interface ListMyNotificationsOutput {
  readonly notifications: MyNotificationOutput[];
  /** The number of the notifications that agree with the filters */
  readonly total: number;
  readonly next_cursor: string | null;
}

const buildReadWhere = (
  read: MyNotificationReadFilter,
): Prisma.OnSiteNotificationWhereInput => {
  switch (read) {
    case MyNotificationReadFilter.Unread:
      return { readAt: null };

    case MyNotificationReadFilter.Read:
      return { readAt: { not: null } };

    case MyNotificationReadFilter.All:
      return {};

    default:
      throw new Error(`Unknown read filter: ${read satisfies never}`);
  }
};

const buildArchivedWhere = (
  archived: MyNotificationArchivedFilter,
): Prisma.OnSiteNotificationWhereInput => {
  switch (archived) {
    case MyNotificationArchivedFilter.No:
      return { archivedAt: null };

    case MyNotificationArchivedFilter.Yes:
      return { archivedAt: { not: null } };

    case MyNotificationArchivedFilter.All:
      return {};

    default:
      throw new Error(`Unknown archived filter: ${archived satisfies never}`);
  }
};

/**
 * The notifications of the citizen of the actor, filtered by the read state
 * and by the archive, the newest first. The notification center uses
 * `listOwnOnSiteNotifications()` instead, which pages through one tab.
 *
 * @throws ForbiddenError for a user without a citizen
 * @throws ValidationError when no own notification has the cursor
 */
export const listMyNotifications = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListMyNotificationsInput,
): Promise<ListMyNotificationsOutput> => {
  const citizenId = requireCitizen(actor).id;

  const where: Prisma.OnSiteNotificationWhereInput = {
    citizenId,
    ...buildReadWhere(input.read),
    ...buildArchivedWhere(input.archived),
  };

  const [page, total] = await Promise.all([
    paginateByDatabaseCursor(
      { cursor: input.cursor, pageSize: input.limit },
      (cursorArguments) =>
        context.prisma.onSiteNotification.findMany({
          where,
          // Two notifications can have the same `createdAt`, thus `id` makes
          // the order total
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            notificationType: true,
            payload: true,
            createdAt: true,
            readAt: true,
            archivedAt: true,
          },
          ...cursorArguments,
        }),
      async (id) =>
        (await context.prisma.onSiteNotification.count({
          where: { id, citizenId },
        })) > 0,
    ),
    context.prisma.onSiteNotification.count({ where }),
  ]);

  return {
    notifications: page.items.map((notification) => ({
      id: notification.id,
      type: notification.notificationType,
      payload: notification.payload,
      created_at: notification.createdAt.toISOString(),
      read_at: notification.readAt?.toISOString() ?? null,
      archived_at: notification.archivedAt?.toISOString() ?? null,
    })),
    total,
    next_cursor: page.nextCursor,
  };
};
