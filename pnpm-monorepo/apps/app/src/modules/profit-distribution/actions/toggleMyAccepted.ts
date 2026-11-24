"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  setOwnParticipationInputSchema,
  setOwnPayoutAccepted,
} from "@sam-monorepo/application";
import * as z from "zod";
import { getProfitDistributionErrorTexts } from "../utils/profitDistributionErrorTexts";

const schema = setOwnParticipationInputSchema.extend({
  enabled: z.stringbool(),
});

export const toggleMyAccepted = createUseCaseAction({
  name: "toggleMyAccepted",
  schema,
  useCase: setOwnPayoutAccepted,
  parseFormData: (formData) => {
    // The last entry of each field, see `ToggleMyAcceptedButton`
    const { id, value } = Object.fromEntries(formData);

    return { cycle_id: id, enabled: value };
  },
  texts: getProfitDistributionErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
