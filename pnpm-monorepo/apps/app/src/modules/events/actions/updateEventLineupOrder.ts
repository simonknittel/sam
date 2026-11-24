"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  reorderLineup,
  reorderLineupInputSchema,
  type LineupOrderNode,
} from "@sam-monorepo/application";
import {
  EVENT_CONTAINER_ID_FIELD,
  EVENT_CONTAINER_KIND_FIELD,
} from "../utils/eventContainer";
import { EVENT_ERROR_TEXTS } from "../utils/eventErrorTexts";

export interface MappedPosition {
  id: string;
  order: number;
  childPositions?: MappedPosition[];
}

/**
 * A position without children has no `children` key: the schema refuses the
 * key on the last level
 */
const toLineupOrder = (positions: MappedPosition[]): LineupOrderNode[] =>
  positions.map((position) => ({
    id: position.id,
    order: position.order,
    ...(position.childPositions?.length
      ? { children: toLineupOrder(position.childPositions) }
      : {}),
  }));

export const updateEventLineupOrder = createUseCaseAction({
  name: "updateEventLineupOrder",
  schema: reorderLineupInputSchema,
  useCase: reorderLineup,
  /**
   * An order that is not valid JSON or that has a different shape throws
   * here, and the action answers with a bad request
   */
  parseFormData: (formData) => ({
    container_kind: formData.get(EVENT_CONTAINER_KIND_FIELD),
    container_id: formData.get(EVENT_CONTAINER_ID_FIELD),
    positions: toLineupOrder(
      JSON.parse(formData.get("order") as string) as MappedPosition[],
    ),
  }),
  texts: EVENT_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
