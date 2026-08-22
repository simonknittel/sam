import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";

const wikiPageReportSelect = {
  id: true,
  message: true,
  uploadId: true,
  uploadFileName: true,
  createdAt: true,
  createdBy: { select: { id: true, handle: true } },
  resolvedAt: true,
  resolvedBy: { select: { id: true, handle: true } },
  resolutionComment: true,
  page: {
    select: {
      id: true,
      title: true,
      slug: true,
      iconId: true,
      deletedAt: true,
      eventId: true,
      templateId: true,
    },
  },
} satisfies Prisma.WikiPageReportSelect;

export type WikiPageReportRow = Prisma.WikiPageReportGetPayload<{
  select: typeof wikiPageReportSelect;
}>;

/** All reports for the `wiki;manage`-gated triage table. */
export const getWikiPageReports = cache(
  withTrace("getWikiPageReports", async (): Promise<WikiPageReportRow[]> => {
    return prisma.wikiPageReport.findMany({
      orderBy: { createdAt: "desc" },
      select: wikiPageReportSelect,
    });
  }),
);

export const getWikiPageReportById = cache(
  withTrace(
    "getWikiPageReportById",
    async (reportId: string): Promise<WikiPageReportRow | null> => {
      return prisma.wikiPageReport.findUnique({
        where: { id: reportId },
        select: wikiPageReportSelect,
      });
    },
  ),
);
