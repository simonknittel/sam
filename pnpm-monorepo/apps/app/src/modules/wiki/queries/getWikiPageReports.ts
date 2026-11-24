import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findWikiPageReport,
  findWikiPageReportRows,
} from "@sam-monorepo/application";
import { cache } from "react";

export type { WikiPageReportRow } from "@sam-monorepo/application";

export const getWikiPageReports = cache(
  withTrace("getWikiPageReports", async () => {
    try {
      return await findWikiPageReportRows(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);

export const getWikiPageReportById = cache(
  withTrace("getWikiPageReportById", async (reportId: string) => {
    try {
      return await findWikiPageReport(
        getApplicationContext(),
        await getRequestActor(),
        { reportId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
