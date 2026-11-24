"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  setOwnParticipationInputSchema,
  setOwnShareCeded,
} from "@sam-monorepo/application";
import * as z from "zod";
import { getProfitDistributionErrorTexts } from "../utils/profitDistributionErrorTexts";

const schema = setOwnParticipationInputSchema.extend({
  enabled: z.stringbool(),
});

export const toggleMyCeded = createUseCaseAction({
  name: "toggleMyCeded",
  schema,
  useCase: setOwnShareCeded,
  parseFormData: (formData) => {
    // The last entry of each field, see `ToggleMyCededButton`
    const { id, value } = Object.fromEntries(formData);

    return { cycle_id: id, enabled: value };
  },
  texts: getProfitDistributionErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
