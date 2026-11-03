"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  subscribeWebPushInputSchema,
  subscribeWebPush as subscribeWebPushUseCase,
} from "@sam-monorepo/application";

export const subscribeWebPush = createUseCaseAction({
  name: "subscribeWebPush",
  schema: subscribeWebPushInputSchema,
  useCase: subscribeWebPushUseCase,
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
  success: (t) => t("Common.successfullySaved"),
});
