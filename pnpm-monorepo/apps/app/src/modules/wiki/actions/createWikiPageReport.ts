"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  revalidateWikiScope,
} from "../queries/getWikiPageScopedContext";

/** Simple abuse guard: at most this many unresolved reports per user */
const MAX_OPEN_REPORTS_PER_USER = 5;

const schema = z.object({
  pageId: z.cuid2(),
  /** Set when the report targets a file attachment instead of the page */
  uploadId: z.cuid().optional(),
  message: z.string().trim().min(1).max(2048),
});

/**
 * Upload.fileName is stored URI-encoded (see uploadWikiPageFile); the
 * report snapshots the display name. Malformed encodings fall back to the
 * stored value.
 */
const decodeUploadFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};

export const createWikiPageReport = createAuthenticatedAction(
  "createWikiPageReport",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.pageId);
    const citizenId = authentication.session.entity?.id;
    if (!scoped || !citizenId)
      return { error: t("Common.notFound"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.pageId);
    if (!page || page.deletedAt || !context.permissions.get(page.id)?.canRead)
      return { error: t("Common.notFound"), requestPayload: formData };

    /**
     * Only uploads linked to the reported page can be reported — the link
     * also scopes what the reporter could actually see (same check as the
     * attachment download route).
     */
    let upload: { id: string; fileName: string } | null = null;
    if (data.uploadId) {
      upload = await prisma.upload.findFirst({
        where: { id: data.uploadId, wikiPages: { some: { id: page.id } } },
        select: { id: true, fileName: true },
      });
      if (!upload)
        return { error: t("Common.notFound"), requestPayload: formData };
    }

    const openReports = await prisma.wikiPageReport.count({
      where: { createdById: citizenId, resolvedAt: null },
    });
    if (openReports >= MAX_OPEN_REPORTS_PER_USER)
      return {
        error:
          "Du hast bereits zu viele offene Meldungen. Bitte warte, bis diese bearbeitet wurden.",
        requestPayload: formData,
      };

    const report = await prisma.wikiPageReport.create({
      data: {
        pageId: page.id,
        message: data.message,
        createdById: citizenId,
        ...(upload && {
          uploadId: upload.id,
          uploadFileName: decodeUploadFileName(upload.fileName),
        }),
      },
      select: { id: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_REPORTED,
        data: {
          reportId: report.id,
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          ...(upload && { uploadId: upload.id }),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    await triggerNotifications([
      {
        type: "WikiPageReported",
        payload: {
          reportId: report.id,
        },
      },
    ]);

    revalidateWikiScope(scoped);

    return { success: "Meldung gesendet." };
  },
);
