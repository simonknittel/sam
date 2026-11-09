"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateManufacturer,
  updateManufacturerInputSchema,
} from "@sam-monorepo/application";
import { FLEET_ERROR_TEXTS } from "../utils/fleetErrorTexts";

export const updateManufacturerAction = createUseCaseAction({
  name: "updateManufacturerAction",
  schema: updateManufacturerInputSchema,
  useCase: updateManufacturer,
  texts: FLEET_ERROR_TEXTS,
  parseFormData: (formData) => ({
    manufacturer_id: formData.get("id"),
    name: formData.get("name"),
  }),
  success: (t) => t("Common.successfullySaved"),
});
