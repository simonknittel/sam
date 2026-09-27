import { addCountsByAppSlug } from "@/modules/apps/utils/addCountsByAppSlug";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { cache } from "react";
import { READ_MARKER_SUBJECTS } from "../utils/readMarkerSubjects";
import { getUnreadWhere } from "./getUnreadWhere";

/**
 * The number of new items of each subject type, keyed by the app whose dot
 * badge shows it. A subject type which the viewer may not read counts 0.
 */
export const getNewItemCountsByAppSlug = cache(
  withTrace(
    "getNewItemCountsByAppSlug",
    async (): Promise<Record<string, number>> => {
      const authentication = await authenticate();
      if (!authentication) return {};

      const counts = await Promise.all(
        Object.values(ReadMarkerSubject).map(async (subject) => {
          const definition = READ_MARKER_SUBJECTS[subject];

          if (
            !(await authentication.authorize(definition.readResource, "read"))
          )
            return { [definition.appSlug]: 0 };

          const unreadWhere = await getUnreadWhere(subject);
          if (!unreadWhere) return { [definition.appSlug]: 0 };

          return {
            [definition.appSlug]: await definition.countNew(unreadWhere),
          };
        }),
      );

      // Subjects of the same app share its dot badge
      return addCountsByAppSlug(...counts);
    },
  ),
);
