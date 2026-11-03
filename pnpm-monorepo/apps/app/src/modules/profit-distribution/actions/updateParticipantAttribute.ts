"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateCycleParticipants,
  updateCycleParticipantsInputSchema,
} from "@sam-monorepo/application";
import { getProfitDistributionErrorTexts } from "../utils/profitDistributionErrorTexts";

const CYCLE_ID_FIELD = "cycleId";

export const updateParticipantAttribute = createUseCaseAction({
  name: "updateParticipantAttribute",
  schema: updateCycleParticipantsInputSchema,
  useCase: updateCycleParticipants,
  /**
   * Each ticked checkbox sends a field with the name
   * `<attribute>_<cycle id>_<citizen id>` (see `CitizenTable`)
   */
  parseFormData: (formData) => ({
    cycle_id: formData.get(CYCLE_ID_FIELD),
    enabled_attributes: Array.from(formData.keys())
      .filter((key) => key !== CYCLE_ID_FIELD && !key.startsWith("$ACTION"))
      .map((key) => {
        const [attribute, , citizenId] = key.split("_");

        return { attribute, citizen_id: citizenId };
      }),
  }),
  texts: getProfitDistributionErrorTexts,
  success: (t) => t("Common.successfullySaved"),
});
