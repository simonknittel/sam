"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateVariantInputSchema,
  updateVariant as updateVariantUseCase,
} from "@sam-monorepo/application";
import { FLEET_ERROR_TEXTS } from "../utils/fleetErrorTexts";
import { parseVariantFieldsFormData } from "../utils/parseVariantFieldsFormData";

export const updateVariant = createUseCaseAction({
  name: "updateVariant",
  schema: updateVariantInputSchema,
  useCase: updateVariantUseCase,
  texts: FLEET_ERROR_TEXTS,
  parseFormData: (formData) => ({
    variant_id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    ...parseVariantFieldsFormData(formData),
  }),
  success: (t) => t("Common.successfullySaved"),
});
