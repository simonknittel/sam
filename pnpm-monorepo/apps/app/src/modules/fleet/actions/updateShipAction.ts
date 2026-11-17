"use server";

import { createUseCaseAction } from "@/modules/application";
import { updateShip, updateShipInputSchema } from "@sam-monorepo/application";
import { parseAcquisitionSourceFormValue } from "../utils/parseAcquisitionSourceFormValue";

/** The inline fields of the ships table send one field each */
export const updateShipAction = createUseCaseAction({
  name: "updateShipAction",
  schema: updateShipInputSchema,
  useCase: updateShip,
  parseFormData: (formData) => ({
    ship_id: formData.get("id"),
    name: formData.has("name") ? formData.get("name") : undefined,
    acquisition_source: formData.has("acquisitionSource")
      ? parseAcquisitionSourceFormValue(formData.get("acquisitionSource"))
      : undefined,
    note: formData.has("note") ? formData.get("note") : undefined,
  }),
  success: (t) => t("Common.successfullySaved"),
});
