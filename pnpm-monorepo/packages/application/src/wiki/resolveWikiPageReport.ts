import {
  AuditEventType,
  WIKI_REPORT_TEXT_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiErrorMessage } from "./wikiErrors.js";

export const resolveWikiPageReportInputSchema = z.object({
  report_id: idSchema,
  /** An empty comment is no comment */
  resolution_comment: z
    .string()
    .trim()
    .max(WIKI_REPORT_TEXT_MAXIMUM_LENGTH)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type ResolveWikiPageReportInput = z.infer<
  typeof resolveWikiPageReportInputSchema
>;

export interface ResolveWikiPageReportOutput {
  readonly report_id: string;
}

export const resolveWikiPageReport = (
  context: ApplicationContext,
  actor: Actor,
  input: ResolveWikiPageReportInput,
): Promise<ResolveWikiPageReportOutput> =>
  withSpan(context, "resolveWikiPageReport", async () => {
    requirePermission(actor, "wiki", "manage");
    const citizen = requireCitizen(actor);

    const report = await context.prisma.wikiPageReport.findUnique({
      where: { id: input.report_id },
      select: { id: true, pageId: true },
    });
    if (!report) throw new NotFoundError(WikiErrorMessage.ReportNotFound);

    /**
     * The condition on `resolvedAt` makes the check and the write one step:
     * of two managers at the same time, only one resolves the report
     */
    const { count } = await context.prisma.wikiPageReport.updateMany({
      where: { id: report.id, resolvedAt: null },
      data: {
        resolvedAt: context.now(),
        resolvedById: citizen.id,
        resolutionComment: input.resolution_comment ?? null,
      },
    });
    if (count === 0)
      throw new ConflictError(WikiErrorMessage.ReportAlreadyResolved);

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_REPORT_RESOLVED,
        data: { reportId: report.id, pageId: report.pageId },
        createdById: actor.userId,
      },
    ]);

    return { report_id: report.id };
  });
