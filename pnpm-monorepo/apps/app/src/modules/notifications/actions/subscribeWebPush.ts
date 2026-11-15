"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  subscribeWebPushInputSchema,
  subscribeWebPush as subscribeWebPushUseCase,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";
import { headers } from "next/headers";

export const subscribeWebPush = createAuthenticatedAction(
  "subscribeWebPush",
  subscribeWebPushInputSchema,
  async (formData, authentication, data, t) => {
    try {
      await subscribeWebPushUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
        { userAgent: (await headers()).get("user-agent") },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    refresh();

    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    // A text that is not JSON gives the answer to a bad request
    parseFormData: (formData) => {
      const subscription = formData.get("subscription");

      return {
        subscription:
          typeof subscription === "string"
            ? (JSON.parse(subscription) as unknown)
            : null,
      };
    },
  },
);
