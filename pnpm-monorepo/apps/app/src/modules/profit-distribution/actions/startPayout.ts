"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  startPayoutInputSchema,
  startPayout as startPayoutUseCase,
} from "@sam-monorepo/application";
import { getProfitDistributionErrorTexts } from "../utils/profitDistributionErrorTexts";

export const startPayout = createUseCaseAction({
  name: "startPayout",
  schema: startPayoutInputSchema,
  useCase: startPayoutUseCase,
  parseFormData: (formData) => ({
    cycle_id: formData.get("id"),
    // Without the field, the schema refuses the request (not the profit 0)
    auec_profit: formData.has("auecProfit")
      ? Number(formData.get("auecProfit"))
      : undefined,
    // An empty date field: the payout continues until a manager ends it
    payout_ends_at: formData.get("payoutEndsAt") || null,
  }),
  texts: getProfitDistributionErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
