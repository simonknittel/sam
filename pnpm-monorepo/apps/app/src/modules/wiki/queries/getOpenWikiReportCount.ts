import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * Number of unresolved page reports, for the wiki app-tile dot badge and
 * the "Meldungen" navigation entry. 0 for users without `wiki;manage`.
 */
export const getOpenWikiReportCount = cache(
  withTrace("getOpenWikiReportCount", async (): Promise<number> => {
    const authentication = await authenticate();
    if (!authentication) return 0;
    if (!(await authentication.authorize("wiki", "manage"))) return 0;

    return prisma.wikiPageReport.count({ where: { resolvedAt: null } });
  }),
);
