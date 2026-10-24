import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  DATE_TIME_INPUT_DESCRIPTION,
  dateTimeInputSchema,
} from "../dateTime.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByDatabaseCursor,
  type PageOptions,
} from "../pagination.js";
import {
  MANUAL_NOTIFICATION_SELECT,
  toManualNotificationOutput,
  type ManualNotificationOutput,
} from "./manualNotificationOutput.js";

/** The length of the search field of the filter sidebar */
const MAXIMUM_SEARCH_LENGTH = 100;

export const listManualNotificationsInputSchema = z.object({
  search: z
    .string()
    .trim()
    .max(MAXIMUM_SEARCH_LENGTH)
    .optional()
    .describe(
      "Only the notifications whose title or body contains this text, without regard to the case.",
    ),
  from: dateTimeInputSchema
    .optional()
    .describe(
      `Only the notifications sent at or after this time. ${DATE_TIME_INPUT_DESCRIPTION}`,
    ),
  to: dateTimeInputSchema
    .optional()
    .describe(
      `Only the notifications sent before this time. ${DATE_TIME_INPUT_DESCRIPTION}`,
    ),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListManualNotificationsInput = z.output<
  typeof listManualNotificationsInputSchema
>;

export interface ListManualNotificationsOutput {
  readonly notifications: ManualNotificationOutput[];
  readonly next_cursor: string | null;
  readonly previous_cursor: string | null;
}

const buildWhere = (
  input: ListManualNotificationsInput,
): Prisma.ManualNotificationWhereInput => ({
  ...(input.search
    ? {
        OR: [
          { title: { contains: input.search, mode: "insensitive" } },
          { body: { contains: input.search, mode: "insensitive" } },
        ],
      }
    : {}),
  ...(input.from || input.to
    ? {
        createdAt: {
          ...(input.from ? { gte: input.from } : {}),
          ...(input.to ? { lt: input.to } : {}),
        },
      }
    : {}),
});

/**
 * The sent manual notifications, the newest first. The cursor is the id of a
 * notification.
 *
 * @throws ForbiddenError when the actor does not have `manualNotification;manage`
 * @throws ValidationError when no notification has the cursor (see
 * `PageOptions.unknownCursor`)
 */
export const listManualNotifications = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListManualNotificationsInput,
  { direction, unknownCursor }: PageOptions = {},
): Promise<ListManualNotificationsOutput> => {
  requirePermission(actor, "manualNotification", "manage");

  const where = buildWhere(input);

  const page = await paginateByDatabaseCursor(
    {
      cursor: input.cursor,
      pageSize: input.limit,
      direction,
      unknownCursor,
    },
    (cursorArguments) =>
      context.prisma.manualNotification.findMany({
        where,
        // Two notifications can have the same `createdAt`, thus `id` makes
        // the order total
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: MANUAL_NOTIFICATION_SELECT,
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.manualNotification.count({ where: { id } })) > 0,
  );

  return {
    notifications: page.items.map(toManualNotificationOutput),
    next_cursor: page.nextCursor,
    previous_cursor: page.previousCursor,
  };
};
