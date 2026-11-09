"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateSeriesInputSchema,
  updateSeries as updateSeriesUseCase,
} from "@sam-monorepo/application";
import { FLEET_ERROR_TEXTS } from "../utils/fleetErrorTexts";

export const updateSeries = createUseCaseAction({
  name: "updateSeries",
  schema: updateSeriesInputSchema,
  useCase: updateSeriesUseCase,
  texts: FLEET_ERROR_TEXTS,
  parseFormData: (formData) => ({
    series_id: formData.get("id"),
    name: formData.get("name"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
