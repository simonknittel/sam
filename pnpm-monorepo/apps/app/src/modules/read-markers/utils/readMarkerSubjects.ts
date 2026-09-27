import { prisma } from "@/db";
import { getOpenEventsWhere } from "@/modules/events/queries/getOpenEventsWhere";
import { getVisibleEventsWhere } from "@/modules/events/utils/eventVisibility";
import { getOpenTasksWhere } from "@/modules/tasks/queries/getOpenTasksWhere";
import { getVisibleTasksWhere } from "@/modules/tasks/queries/getVisibleTasksWhere";
import type { Prisma } from "@sam-monorepo/database/client";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import type { PermissionSet } from "@sam-monorepo/permissions";

/**
 * The part of the "new" predicate that is the same for all subjects (see
 * `getUnreadWhere`). It fits the where input of each subject model, because
 * each of them has `createdAt`, `createdById` and a `readMarkers` relation.
 */
export interface UnreadWhere {
  readonly createdAt: { readonly gt: Date };
  readonly OR: ({ createdById: null } | { createdById: { not: string } })[];
  readonly readMarkers: { readonly none: { readonly citizenId: string } };
}

interface ReadMarkerSubjectDefinition {
  /**
   * Items created before this date are never new. It is the start of the
   * read markers for the subject type, thus its existing items do not
   * suddenly show as new for everybody.
   */
  readonly trackedSince: Date;
  /** The app whose dot badge counts the new items */
  readonly appSlug: string;
  /** The resource of the permission to read the items at all */
  readonly readResource: PermissionSet["resource"];
  /** The marker column which points at the item */
  readonly markerData: (
    subjectId: string,
  ) => Omit<
    Prisma.ReadMarkerUncheckedCreateInput,
    "id" | "citizenId" | "readAt"
  >;
  /** Whether the item exists and the viewer can see it */
  readonly canRead: (subjectId: string) => Promise<boolean>;
  /**
   * Of the given items, the ones which are new. The visibility is not
   * checked again: the ids come from queries which already applied it.
   */
  readonly findNewIds: (
    subjectIds: string[],
    unreadWhere: UnreadWhere,
  ) => Promise<string[]>;
  /** How many of the items which the viewer can see are new */
  readonly countNew: (unreadWhere: UnreadWhere) => Promise<number>;
}

/**
 * The start of the read markers for tasks and events. Set to the merge date
 * of the feature, thus only the few items created between the merge and the
 * release show as new at the rollout.
 */
const TASKS_AND_EVENTS_TRACKED_SINCE = new Date("2026-09-27T00:00:00Z");

/**
 * Everything the generic read markers need to know about a subject type. An
 * item is new when it is "open" in the sense of its subject and matches
 * `UnreadWhere`.
 *
 * To add a subject type:
 * 1. In the database: see the comment of the `ReadMarker` model.
 * 2. Add a value to the `ReadMarkerSubject` enum of the domain package.
 * 3. Add an entry here. The subject model must have `createdAt`,
 *    `createdById` and the relation `readMarkers`, thus `UnreadWhere` fits
 *    it. Subjects of one app share its dot badge; the counts add up.
 * 4. In the lists: get the new items of each page with `getNewIds()`, and
 *    show them with `useMarkAsRead()`, `<UnreadEdge>` and
 *    `<NewMarkerButton>`.
 * 5. On the details: add `<MarkAsReadOnMount>`.
 */
export const READ_MARKER_SUBJECTS: Record<
  ReadMarkerSubject,
  ReadMarkerSubjectDefinition
> = {
  [ReadMarkerSubject.Task]: {
    trackedSince: TASKS_AND_EVENTS_TRACKED_SINCE,
    appSlug: "tasks",
    readResource: "task",
    markerData: (subjectId) => ({ taskId: subjectId }),
    canRead: async (subjectId) =>
      (await prisma.task.count({
        where: {
          AND: [{ id: subjectId }, await getVisibleTasksWhere()],
          deletedAt: null,
        },
      })) > 0,
    findNewIds: async (subjectIds, unreadWhere) => {
      const tasks = await prisma.task.findMany({
        where: {
          AND: [
            { id: { in: subjectIds } },
            getOpenTasksWhere(new Date()),
            unreadWhere,
          ],
        },
        select: { id: true },
      });
      return tasks.map((task) => task.id);
    },
    countNew: async (unreadWhere) =>
      prisma.task.count({
        where: {
          AND: [
            await getVisibleTasksWhere(),
            getOpenTasksWhere(new Date()),
            unreadWhere,
          ],
        },
      }),
  },

  [ReadMarkerSubject.Event]: {
    trackedSince: TASKS_AND_EVENTS_TRACKED_SINCE,
    appSlug: "events",
    readResource: "event",
    markerData: (subjectId) => ({ eventId: subjectId }),
    canRead: async (subjectId) =>
      (await prisma.event.count({
        where: { AND: [{ id: subjectId }, await getVisibleEventsWhere()] },
      })) > 0,
    findNewIds: async (subjectIds, unreadWhere) => {
      const events = await prisma.event.findMany({
        where: {
          AND: [
            { id: { in: subjectIds } },
            getOpenEventsWhere(new Date()),
            unreadWhere,
          ],
        },
        select: { id: true },
      });
      return events.map((event) => event.id);
    },
    countNew: async (unreadWhere) =>
      prisma.event.count({
        where: {
          AND: [
            await getVisibleEventsWhere(),
            getOpenEventsWhere(new Date()),
            unreadWhere,
          ],
        },
      }),
  },
};
