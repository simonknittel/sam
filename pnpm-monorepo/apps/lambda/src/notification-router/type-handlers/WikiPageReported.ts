import { prisma, type WikiPageReport } from "@sam-monorepo/database";
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
          handle: true,
        },
      },
    },
  });
  if (!report) return;

  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      permissionString: "wiki;manage",
    },
    select: {
      roleId: true,
    },
  });
  if (permissionStrings.length <= 0) return;

  const recipients = await prisma.entity.findMany({
    where: {
      roleAssignments: {
        some: {
          roleId: {
            in: permissionStrings.map((item) => item.roleId),
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (recipients.length <= 0) return;

  /**
   * Publish notifications
   */
  await publishNotifications(
    recipients.map((recipient) => ({
      receiverId: recipient.id,
      notificationType: "wiki_page_reported" as const,
      payload: {
        reportId: report.id,
        pageTitle: report.page.title,
        uploadFileName: report.uploadFileName,
        reportedByHandle: report.createdBy?.handle ?? null,
      },
      title: "Neue Meldung im Wiki",
      body: report.uploadFileName
        ? `${report.createdBy?.handle ?? "Unbekannt"} hat den Dateianhang "${report.uploadFileName}" auf der Seite "${report.page.title}" gemeldet`
        : `${report.createdBy?.handle ?? "Unbekannt"} hat die Seite "${report.page.title}" gemeldet`,
      url: "/app/wiki/reports",
    })),
  );
};
