"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const entries = await validateEntries(data.entries);
    if (!entries)
      return { error: t("Common.badRequest"), requestPayload: formData };

    await prisma.logAnalyzerEntry.createMany({
      data: entries.map((entry) => ({
        type: entry.type,
        rawLine: entry.rawLine,
        eventAt: entry.eventAt,
        hash: entry.hash,
        createdById: citizenId,
      })),
      skipDuplicates: true,
    });

    return { success: "Einträge geteilt." };
  },
  {
    parseFormData: parseUploadFormData,
  },
);
