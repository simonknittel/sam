import { getCitizenDisplayName } from "@sam-monorepo/domain";
import { findCitizenIdsWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import { CITIZEN_REFERENCE_SELECT } from "../../citizenReference.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindWikiPageReportedRecipientsInput {
  readonly reportId: string;
}

export interface WikiPageReportedRecipients {
  readonly report: {
    readonly id: string;
    readonly pageTitle: string;
    readonly uploadFileName: string | null;
    /** The display name, also the label of a deleted citizen */
    readonly reportedByName: string | null;
  };
  readonly recipients: Recipient[];
}

/**
 * Everyone with the effective `wiki;manage`. The store of the on-site
 * notifications adds `login;manage` and the conditions of the user (see
 * `storeOnSiteNotifications()`). Null when the report does not exist.
 */
export const findWikiPageReportedRecipients = async (
  context: ApplicationContext,
  input: FindWikiPageReportedRecipientsInput,
): Promise<WikiPageReportedRecipients | null> => {
  const report = await context.prisma.wikiPageReport.findUnique({
    where: {
      id: input.reportId,
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
        select: CITIZEN_REFERENCE_SELECT,
      },
    },
  });
  if (!report) return null;

  const reportedByName = report.createdBy
    ? getCitizenDisplayName(report.createdBy)
    : null;

  const recipientIds = await findCitizenIdsWithPermissions(context, {}, [
    { resource: "wiki", operation: "manage" },
  ]);

  return {
    report: {
      id: report.id,
      pageTitle: report.page.title,
      uploadFileName: report.uploadFileName,
      reportedByName,
    },
    recipients: Array.from(recipientIds, (citizenId) => ({ citizenId })),
  };
};
