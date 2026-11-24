import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";

const WIKI_PAGE_REPORT_SELECT = {
  id: true,
  message: true,
  uploadId: true,
  uploadFileName: true,
  createdAt: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  resolvedAt: true,
  resolvedBy: { select: CITIZEN_REFERENCE_SELECT },
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
} as const satisfies Prisma.WikiPageReportSelect;

export type WikiPageReportRow = Prisma.WikiPageReportGetPayload<{
  select: typeof WIKI_PAGE_REPORT_SELECT;
}>;

/**
 * The table filters the reports in memory, and there is no limit (a known
 * defect)
 */
export const findWikiPageReportRows = (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<WikiPageReportRow[]> => {
  requirePermission(actor, "wiki", "manage");

  return context.prisma.wikiPageReport.findMany({
    orderBy: { createdAt: "desc" },
    select: WIKI_PAGE_REPORT_SELECT,
  });
};

export const findWikiPageReport = (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { reportId }: { readonly reportId: string },
): Promise<WikiPageReportRow | null> => {
  requirePermission(actor, "wiki", "manage");

  return context.prisma.wikiPageReport.findUnique({
    where: { id: reportId },
    select: WIKI_PAGE_REPORT_SELECT,
  });
};

export const countOpenWikiReports = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<number> => {
  if (!actor.authorize("wiki", "manage")) return 0;

  return context.prisma.wikiPageReport.count({ where: { resolvedAt: null } });
};
