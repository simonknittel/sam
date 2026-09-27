import { prisma, type WikiPageReport } from "@sam-monorepo/database";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import { findCitizenIdsWithPermissions } from "../../common/effectivePermissions";
import { publishNotifications } from "../publish";

interface Payload {
  reportId: WikiPageReport["id"];
}

export const WikiPageReportedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients: everyone whose roles grant `wiki;manage`
   */
  const report = await prisma.wikiPageReport.findUnique({
    where: {
      id: payload.reportId,
    },
    select: {
      id: true,
      uploadFileName: true,
      page: {
        select: {
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          handle: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!report) return;

  const reportedByName = report.createdBy
    ? getCitizenDisplayName(report.createdBy)
    : null;

  const recipientIds = await findCitizenIdsWithPermissions({}, [
    { resource: "wiki", operation: "manage" },
  ]);
  if (recipientIds.size === 0) return;

  /**
   * Publish notifications
   */
  await publishNotifications(
    Array.from(recipientIds, (recipientId) => ({
      receiverId: recipientId,
      notificationType: "wiki_page_reported" as const,
      payload: {
        reportId: report.id,
        pageTitle: report.page.title,
        uploadFileName: report.uploadFileName,
        // The app shows this value in the on-site text, thus it holds the
        // label of a deleted citizen.
        reportedByHandle: reportedByName,
      },
      title: "Neue Meldung im Wiki",
      body: report.uploadFileName
        ? `${reportedByName ?? "Unbekannt"} hat den Dateianhang "${report.uploadFileName}" auf der Seite "${report.page.title}" gemeldet`
        : `${reportedByName ?? "Unbekannt"} hat die Seite "${report.page.title}" gemeldet`,
      url: "/app/wiki/reports",
    })),
  );
};
