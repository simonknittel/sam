import {
  AuditEventType,
  WIKI_REPORT_TEXT_MAXIMUM_LENGTH,
  decodeUploadFileName,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireWikiPageOfScope } from "./wikiScope.js";

/** A simple guard against abuse: the most open reports of one citizen */
const MAXIMUM_OPEN_WIKI_REPORTS_PER_CITIZEN = 5;

export const createWikiPageReportInputSchema = z.object({
  page_id: idSchema,
  /** Set when the report is about an attachment of the page */
  upload_id: idSchema.optional(),
  message: z.string().trim().min(1).max(WIKI_REPORT_TEXT_MAXIMUM_LENGTH),
});

export type CreateWikiPageReportInput = z.infer<
  typeof createWikiPageReportInputSchema
>;

export interface CreateWikiPageReportOutput {
  readonly report_id: string;
}

/**
 * Reports a page of the wiki or of a briefing, or an attachment of the page,
 * to the wiki managers
 *
 * @throws ForbiddenError for a user without a citizen
 * @throws NotFoundError when the actor cannot read the page, or the upload
 * is not an attachment of the page
 * @throws ValidationError when the citizen has too many open reports
 */
export const createWikiPageReport = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateWikiPageReportInput,
): Promise<CreateWikiPageReportOutput> =>
  withSpan(context, "createWikiPageReport", async () => {
    const citizen = requireCitizen(actor);

    const { page } = await requireWikiPageOfScope(
      context,
      actor,
      input.page_id,
      WikiPageAccessTier.Read,
    );

    /**
     * Only the attachments of the page: the link also limits the report to
     * what the reporter can see (the same check as the download route of
     * the attachments)
     */
    const upload = input.upload_id
      ? await context.prisma.upload.findFirst({
          where: {
            id: input.upload_id,
            wikiPageLinks: { some: { pageId: page.id } },
          },
          select: { id: true, fileName: true },
        })
      : null;
    if (input.upload_id && !upload)
      throw new NotFoundError(WikiErrorMessage.AttachmentNotFound);

    /**
     * The count is not in a transaction with the create, thus submits at the
     * same time can go above the limit (a known defect)
     */
    const openReportCount = await context.prisma.wikiPageReport.count({
      where: { createdById: citizen.id, resolvedAt: null },
    });
    if (openReportCount >= MAXIMUM_OPEN_WIKI_REPORTS_PER_CITIZEN)
      throw new ValidationError(WikiErrorMessage.TooManyOpenReports);

    const report = await context.prisma.wikiPageReport.create({
      data: {
        pageId: page.id,
        message: input.message,
        createdById: citizen.id,
        ...(upload && {
          uploadId: upload.id,
          uploadFileName: decodeUploadFileName(upload.fileName),
        }),
      },
      select: { id: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_REPORTED,
        data: {
          reportId: report.id,
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          ...(upload && { uploadId: upload.id }),
        },
        createdById: actor.userId,
      },
    ]);

    await triggerNotificationsAfterSave(context, [
      { type: "WikiPageReported", payload: { reportId: report.id } },
    ]);

    return { report_id: report.id };
  });
