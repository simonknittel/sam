"use server";

import { createUseCaseAction } from "@/modules/application";
import { createShip, createShipInputSchema } from "@sam-monorepo/application";
import { parseAcquisitionSourceFormValue } from "../utils/parseAcquisitionSourceFormValue";

export const createShipAction = createUseCaseAction({
  name: "createShipAction",
  schema: createShipInputSchema,
  useCase: createShip,
  parseFormData: (formData) => ({
    variant_id: formData.get("variantId"),
    acquisition_source: parseAcquisitionSourceFormValue(
      formData.get("acquisitionSource"),
    ),
    name: formData.has("name") ? formData.get("name") : undefined,
    note: formData.has("note") ? formData.get("note") : undefined,
  }),
  success: (t) => t("Common.successfullySaved"),
});
