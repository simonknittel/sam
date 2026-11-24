import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { countOpenWikiReports } from "@sam-monorepo/application";
import { cache } from "react";

/** 0 without `wiki;manage` */
export const getOpenWikiReportCount = cache(
  withTrace("getOpenWikiReportCount", async () =>
    countOpenWikiReports(getApplicationContext(), await getRequestActor()),
  ),
);
