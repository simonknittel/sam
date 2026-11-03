"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createLineupPosition,
  createLineupPositionInputSchema,
} from "@sam-monorepo/application";
import {
  EVENT_CONTAINER_ID_FIELD,
  EVENT_CONTAINER_KIND_FIELD,
} from "../utils/eventContainer";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

/** The lineup editor also adds the positions of an event template */
export const createEventPosition = createUseCaseAction({
  name: "createEventPosition",
  schema: createLineupPositionInputSchema,
  useCase: createLineupPosition,
  parseFormData: (formData) => ({
    container_kind: formData.get(EVENT_CONTAINER_KIND_FIELD),
    container_id: formData.get(EVENT_CONTAINER_ID_FIELD),
    name: formData.get("name"),
    description: formData.has("description")
      ? formData.get("description")
      : undefined,
    required_variant_ids: formData.getAll("variantId[]"),
    required_role_ids: formData.getAll("requiredRoleId[]"),
    required_role_match: formData.has("requiredRoleMatch")
      ? formData.get("requiredRoleMatch")
      : undefined,
    parent_position_id: formData.has("parentPositionId")
      ? formData.get("parentPositionId")
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
