import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { addCountsByAppSlug } from "@/modules/apps/utils/addCountsByAppSlug";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { countNewItemsBySubject } from "@sam-monorepo/application";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { cache } from "react";
import { READ_MARKER_APP_SLUGS } from "../utils/readMarkerSubjects";

/** A subject type which the viewer may not read counts 0 */
export const getNewItemCountsByAppSlug = cache(
  withTrace(
    "getNewItemCountsByAppSlug",
    async (): Promise<Record<string, number>> => {
      const actor = await getOptionalRequestActor();
      if (!actor) return {};

      const counts = await countNewItemsBySubject(
        getApplicationContext(),
        actor,
      );

      return addCountsByAppSlug(
        ...Object.values(ReadMarkerSubject).map((subject) => ({
          [READ_MARKER_APP_SLUGS[subject]]: counts[subject],
        })),
      );
    },
  ),
);
