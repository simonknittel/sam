import type { ReadMarker } from "@sam-monorepo/database/client";
import {
  ReadMarkerSubject,
  type OnSiteNotificationPayload,
  type OnSiteNotificationType,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import {
  countNewChangelogEntries,
  findNewChangelogEntryKeys,
  findTrackedChangelogEntryKeys,
} from "../changelog/changelogReadMarkers.js";
import type { ApplicationContext } from "../context.js";
import {
  buildVisibleEventsWhere,
  toEventViewer,
} from "../events/eventVisibility.js";
import { findNewEventIds, getOpenEventsWhere } from "../events/openEvents.js";
import { findNewTaskIds } from "../tasks/findNewTaskIds.js";
import { getOpenTasksWhere, getVisibleTasksWhere } from "../tasks/taskWhere.js";
import { buildUnreadWhere } from "./unreadWhere.js";

/** The keys of the payload of the notification type which hold a string */
type StringPayloadKey<Type extends OnSiteNotificationType> = {
  [
    Key in keyof OnSiteNotificationPayload<Type>
  ]: OnSiteNotificationPayload<Type>[Key] extends string ? Key : never;
}[keyof OnSiteNotificationPayload<Type>] &
  string;

/**
 * The on-site notification which announces a new item of a subject type. The
 * read of the notification and the read of its item are one read state (see
 * `announcements.ts`).
 */
export interface ReadMarkerAnnouncement {
  readonly notificationType: OnSiteNotificationType;
  /** The key of the payload which holds the id of the item */
  readonly subjectIdKey: string;
}

/** The type checks that the payload of the notification type has the key */
const announcedBy = <Type extends OnSiteNotificationType>(
  notificationType: Type,
  subjectIdKey: StringPayloadKey<Type>,
): ReadMarkerAnnouncement => ({ notificationType, subjectIdKey });

/** The column of `ReadMarker` which points at the item */
type ReadMarkerSubjectColumn = keyof Pick<
  ReadMarker,
  "taskId" | "eventId" | "changelogEntryKey"
>;

interface ReadMarkerSubjectRule {
  /** Whether the actor may read the items of the subject type at all */
  readonly canReadSubject: (actor: Actor) => boolean;
  readonly markerColumn: ReadMarkerSubjectColumn;
  /** Of the given items, the ones which exist and which the actor can see */
  readonly findReadableIds: (
    context: ApplicationContext,
    actor: Actor,
    subjectIds: readonly string[],
  ) => Promise<string[]>;
  /**
   * Of the given items, the ones which are new for the actor. The visibility
   * is not checked again: the ids come from queries which already applied
   * it. Empty for an actor without a citizen.
   */
  readonly findNewIds: (
    context: ApplicationContext,
    actor: Actor,
    subjectIds: readonly string[],
  ) => Promise<string[]>;
  /** How many of the items which the actor can see are new */
  readonly countNew: (
    context: ApplicationContext,
    actor: Actor,
  ) => Promise<number>;
  /** Null when no notification announces the items of the subject type */
  readonly announcement: ReadMarkerAnnouncement | null;
}

/**
 * Everything the generic read markers need to know about a subject type.
 * Tasks and events are new when they are "open" in the sense of their subject
 * and match `UnreadWhere`. Changelog entries are new when they are tracked,
 * from the confirmation day of the actor on, and without a marker.
 *
 * To add a subject type:
 * 1. In the database: see the comment of the `ReadMarker` model.
 * 2. Add a value to the `ReadMarkerSubject` enum of the domain package.
 * 3. For a database row: add its start of the tracking to
 *    `READ_MARKER_TRACKED_SINCE` in `unreadWhere.ts`. The subject model must
 *    have `createdAt`, `createdById` and the relation `readMarkers`, thus
 *    `UnreadWhere` fits it.
 * 4. Add a rule here. When a notification announces a new item, name it in
 *    the rule. Add the app slug of its dot badge to `READ_MARKER_APP_SLUGS` in
 *    the app; subjects of one app share its dot badge, and the counts add up.
 * 5. In the lists: get the new items of each page with `getNewIds()` of the
 *    app, and show them with `useMarkAsRead()`, `<UnreadEdge>` and
 *    `<NewMarkerButton>`.
 * 6. On the details: add `<MarkAsReadOnMount>`.
 */
export const READ_MARKER_SUBJECT_RULES: Record<
  ReadMarkerSubject,
  ReadMarkerSubjectRule
> = {
  [ReadMarkerSubject.Task]: {
    canReadSubject: (actor) => actor.authorize("task", "read"),
    markerColumn: "taskId",
    findReadableIds: async (context, actor, subjectIds) => {
      const tasks = await context.prisma.task.findMany({
        where: {
          AND: [{ id: { in: [...subjectIds] } }, getVisibleTasksWhere(actor)],
          deletedAt: null,
        },
        select: { id: true },
      });

      return tasks.map((task) => task.id);
    },
    findNewIds: async (context, actor, subjectIds) => {
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);
      if (!unreadWhere) return [];

      return findNewTaskIds(
        context.prisma,
        subjectIds,
        unreadWhere,
        context.now(),
      );
    },
    countNew: async (context, actor) => {
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);
      if (!unreadWhere) return 0;

      return context.prisma.task.count({
        where: {
          AND: [
            getVisibleTasksWhere(actor),
            getOpenTasksWhere(context.now()),
            unreadWhere,
          ],
        },
      });
    },
    announcement: announcedBy("task_created", "taskId"),
  },

  [ReadMarkerSubject.Event]: {
    canReadSubject: (actor) => actor.authorize("event", "read"),
    markerColumn: "eventId",
    findReadableIds: async (context, actor, subjectIds) => {
      const events = await context.prisma.event.findMany({
        where: {
          AND: [
            { id: { in: [...subjectIds] } },
            buildVisibleEventsWhere(toEventViewer(actor)),
          ],
        },
        select: { id: true },
      });

      return events.map((event) => event.id);
    },
    findNewIds: async (context, actor, subjectIds) => {
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Event);
      if (!unreadWhere) return [];

      return findNewEventIds(
        context.prisma,
        subjectIds,
        unreadWhere,
        context.now(),
      );
    },
    countNew: async (context, actor) => {
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Event);
      if (!unreadWhere) return 0;

      return context.prisma.event.count({
        where: {
          AND: [
            buildVisibleEventsWhere(toEventViewer(actor)),
            getOpenEventsWhere(context.now()),
            unreadWhere,
          ],
        },
      });
    },
    announcement: announcedBy("event_created", "eventId"),
  },

  [ReadMarkerSubject.ChangelogEntry]: {
    // Each citizen can read the changelog; the app redacts restricted entries
    canReadSubject: () => true,
    markerColumn: "changelogEntryKey",
    findReadableIds: async (context, _actor, subjectIds) =>
      findTrackedChangelogEntryKeys(context, subjectIds),
    findNewIds: findNewChangelogEntryKeys,
    countNew: countNewChangelogEntries,
    announcement: null,
  },
};
