"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import {
  shareLogAnalyzerEntries,
  shareLogAnalyzerEntriesInputSchema,
} from "@sam-monorepo/application";
import { parseUploadFormData } from "../utils/uploadEntries";

export const uploadLogAnalyzerEntries = createAuthenticatedAction(
  "uploadLogAnalyzerEntries",
  shareLogAnalyzerEntriesInputSchema,
  async (formData, authentication, data, t) => {
    try {
      await shareLogAnalyzerEntries(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        {
          isSharingDisabled: await getUnleashFlag(
            UNLEASH_FLAG.DisableLogAnalyzerSharing,
          ),
        },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    return { success: "Einträge geteilt." };
  },
  {
    parseFormData: parseUploadFormData,
  },
);
