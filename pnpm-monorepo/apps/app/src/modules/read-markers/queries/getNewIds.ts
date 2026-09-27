import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { READ_MARKER_SUBJECTS } from "../utils/readMarkerSubjects";
import { getUnreadWhere } from "./getUnreadWhere";

/**
 * Of the listed items, the ones which are new for the viewer. Batched into a
 * single query, thus a list does not ask once for each row. The caller has
 * already applied the visibility and the read permission to the ids.
 */
export const getNewIds = withTrace(
  "getNewIds",
  async (
    subject: ReadMarkerSubject,
    subjectIds: string[],
  ): Promise<ReadonlySet<string>> => {
    if (subjectIds.length <= 0) return new Set();

    const unreadWhere = await getUnreadWhere(subject);
    if (!unreadWhere) return new Set();

    return new Set(
      await READ_MARKER_SUBJECTS[subject].findNewIds(
        subjectIds,
        unreadWhere,
        new Date(),
      ),
    );
  },
);
