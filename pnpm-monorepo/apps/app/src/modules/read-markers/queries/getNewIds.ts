import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findNewItemIds } from "@sam-monorepo/application";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";

/**
 * The caller has already applied the visibility and the read permission to the
 * ids.
 */
export const getNewIds = withTrace(
  "getNewIds",
  async (
    subject: ReadMarkerSubject,
    subjectIds: string[],
  ): Promise<ReadonlySet<string>> => {
    const actor = await getOptionalRequestActor();
    if (!actor) return new Set();

    return new Set(
      await findNewItemIds(getApplicationContext(), actor, {
        subject,
        subjectIds,
      }),
    );
  },
);
