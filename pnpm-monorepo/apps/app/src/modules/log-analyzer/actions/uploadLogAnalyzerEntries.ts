"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  parseUploadFormData,
  uploadEntriesSchema,
} from "../utils/uploadEntries";
import { validateUploadEntries } from "../utils/validateUploadEntries";

const validateEntries = withTrace(
  "validateLogAnalyzerUploadEntries",
  validateUploadEntries,
);

/**
 * Stores the matched log lines a citizen shares with the other citizens. The
 * unique index on the citizen and the hash absorbs the entries the client
 * sends a second time, for example after a page reload or from a second
 * device.
 *
 * The raw lines hold data of other players, thus neither they nor their
 * hashes are ever written to the logs.
 */
export const uploadLogAnalyzerEntries = createAuthenticatedAction(
  "uploadLogAnalyzerEntries",
  uploadEntriesSchema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("logAnalyzer", "read")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /** The kill switch stops the uploads of every client */
    if (await getUnleashFlag(UNLEASH_FLAG.DisableLogAnalyzerSharing))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const entries = await validateEntries(data.entries);
    if (!entries)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const { count: newEntryCount } = await prisma.logAnalyzerEntry.createMany({
      data: entries.map((entry) => ({
        type: entry.type,
        rawLine: entry.rawLine,
        eventAt: entry.eventAt,
        hash: entry.hash,
        createdById: citizenId,
      })),
      skipDuplicates: true,
    });

    await createAuditEvents([
      {
        type: AuditEventType.LOG_ANALYZER_ENTRIES_UPLOADED,
        data: {
          citizenId,
          entryCount: entries.length,
          newEntryCount,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return { success: "Einträge geteilt." };
  },
  {
    parseFormData: parseUploadFormData,
  },
);
