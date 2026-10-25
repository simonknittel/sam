import { ReadMarkerSubject } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";

/**
 * The start of the read markers for tasks and events. Set to the merge date
 * of the feature, thus only the few items created between the merge and the
 * release show as new at the rollout.
 */
const TASKS_AND_EVENTS_TRACKED_SINCE = new Date("2026-09-27T00:00:00Z");

/**
 * The subject types whose items are database rows. The changelog entries are
 * code in the app and have their own rule (see `changelogReadMarkers.ts`).
 */
type RowReadMarkerSubject = ReadMarkerSubject.Task | ReadMarkerSubject.Event;

/**
 * Items created before this date are never new. It is the start of the read
 * markers for the subject type, thus its existing items do not suddenly show
 * as new for everybody.
 */
export const READ_MARKER_TRACKED_SINCE: Readonly<
  Record<RowReadMarkerSubject, Date>
> = {
  [ReadMarkerSubject.Task]: TASKS_AND_EVENTS_TRACKED_SINCE,
  [ReadMarkerSubject.Event]: TASKS_AND_EVENTS_TRACKED_SINCE,
};

/**
 * The part of the "new" predicate that is the same for all subjects. It fits
 * the where input of each subject model, because each of them has
 * `createdAt`, `createdById` and a `readMarkers` relation.
 */
export interface UnreadWhere {
  readonly createdAt: { readonly gt: Date };
  readonly OR: ({ createdById: null } | { createdById: { not: string } })[];
  readonly readMarkers: { readonly none: { readonly citizenId: string } };
}

/**
 * The creation date after which an item can be new for the actor: the later
 * of the start of the tracking of its subject type and the email
 * confirmation of the actor (the join date, like for the changelog). An
 * actor without a confirmation date (an admin who bypassed it) has no join
 * cutoff.
 */
export const getNewSince = (
  trackedSince: Date,
  emailConfirmedAt: Date | null,
) =>
  emailConfirmedAt && emailConfirmedAt > trackedSince
    ? emailConfirmedAt
    : trackedSince;

/**
 * The items of the subject type which are unread for the actor and count as
 * new if they are also "open": created after the cutoff (see
 * `getNewSince`), not created by the actor and without a marker of the
 * actor. Always combine it with the "open" predicate of the subject.
 *
 * `null` when nothing can be new for the actor, because the actor has no
 * citizen.
 */
export const buildUnreadWhere = (
  actor: Pick<Actor, "citizen" | "emailConfirmedAt">,
  subject: RowReadMarkerSubject,
): UnreadWhere | null => {
  const citizenId = actor.citizen?.id;
  if (!citizenId) return null;

  return {
    createdAt: {
      gt: getNewSince(
        READ_MARKER_TRACKED_SINCE[subject],
        actor.emailConfirmedAt,
      ),
    },
    // Explicit, because SQL `NOT` does not match `NULL`
    OR: [{ createdById: null }, { createdById: { not: citizenId } }],
    readMarkers: { none: { citizenId } },
  };
};
