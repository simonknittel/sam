import {
  findWikiPageReportedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type WikiPageReport } from "@sam-monorepo/database";
import { getWikiPageReportedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  reportId: WikiPageReport["id"];
}

export const WikiPageReportedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findWikiPageReportedRecipients(context, {
    reportId: payload.reportId,
  });
  if (!result) return;

  const { report } = result;
  const notificationPayload = {
    reportId: report.id,
    pageTitle: report.pageTitle,
    uploadFileName: report.uploadFileName,
    // The text shows this value, thus it holds the label of a deleted
    // citizen.
    reportedByHandle: report.reportedByName,
  };
  const text = getWikiPageReportedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "wiki_page_reported" as const,
      payload: notificationPayload,
      ...text,
      url: "/app/wiki/reports",
    })),
  );
};
