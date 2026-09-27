import { authenticate } from "@/modules/auth/server";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { cache } from "react";
import { getNewSince } from "../utils/getNewSince";
import {
  READ_MARKER_SUBJECTS,
  type UnreadWhere,
} from "../utils/readMarkerSubjects";

/**
 * The items of the subject type which are unread for the viewer and count
 * as new if they are also "open": created after the cutoff (see
 * `getNewSince`), not created by the viewer and without a marker of the
 * viewer. Always combine it with the "open" predicate of the subject.
 *
 * `null` when nothing can be new for the viewer, because the session has no
 * citizen.
 */
export const getUnreadWhere = cache(
  async (subject: ReadMarkerSubject): Promise<UnreadWhere | null> => {
    const authentication = await authenticate();
    if (!authentication) return null;

    const citizenId = authentication.session.entity?.id;
    if (!citizenId) return null;

    return {
      createdAt: {
        gt: getNewSince(
          READ_MARKER_SUBJECTS[subject].trackedSince,
          authentication.session.user.emailVerified,
        ),
      },
      // Explicit, because SQL `NOT` does not match `NULL`
      OR: [{ createdById: null }, { createdById: { not: citizenId } }],
      readMarkers: { none: { citizenId } },
    };
  },
);
