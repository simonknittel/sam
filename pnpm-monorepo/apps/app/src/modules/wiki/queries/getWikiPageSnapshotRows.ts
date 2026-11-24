import {
  getApplicationContext,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findWikiPageSnapshotRows,
  type WikiScope,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getWikiPageSnapshotRows = cache(
  withTrace(
    "getWikiPageSnapshotRows",
    async (scope: WikiScope, pageId: string) => {
      try {
        return await findWikiPageSnapshotRows(
          getApplicationContext(),
          scope,
          pageId,
        );
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
