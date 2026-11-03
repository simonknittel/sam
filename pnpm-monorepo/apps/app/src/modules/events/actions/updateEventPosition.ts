"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  updateEventPositionInputSchema,
  updateLineupPosition,
} from "@sam-monorepo/application";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/** The lineup editor also changes the positions of an event template */
export const updateEventPosition = createUseCaseAction({
  name: "updateEventPosition",
  schema: updateEventPositionInputSchema,
  useCase: updateLineupPosition,
  parseFormData: (formData) => ({
    position_id: formData.get("positionId"),
    name: formData.get("name"),
    description: formData.has("description")
      ? formData.get("description")
      : undefined,
    required_variant_ids: formData.getAll("variantId[]"),
    required_role_ids: formData.getAll("requiredRoleId[]"),
    required_role_match: formData.has("requiredRoleMatch")
      ? formData.get("requiredRoleMatch")
      : undefined,
    font_size: formData.has("fontSize") ? formData.get("fontSize") : null,
    background_color: formData.has("backgroundColor")
      ? formData.get("backgroundColor")
      : null,
    text_color: formData.has("textColor") ? formData.get("textColor") : null,
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
