"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  deleteOwnWebPushSubscription,
  deleteOwnWebPushSubscriptionInputSchema,
} from "@sam-monorepo/application";

export const deleteWebPushSubscription = createUseCaseAction({
  name: "deleteWebPushSubscription",
  schema: deleteOwnWebPushSubscriptionInputSchema,
  useCase: deleteOwnWebPushSubscription,
  parseFormData: (formData) => ({
    subscription_id: formData.get("id"),
  }),
  success: (t) => t("Common.successfullyDeleted"),
});
