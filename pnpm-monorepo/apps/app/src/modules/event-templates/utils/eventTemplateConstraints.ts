import {
  EVENT_MAX_VISIBILITY_ROLES,
  EVENT_NAME_MAX_LENGTH,
} from "@/modules/events/utils/eventConstraints";

/**
 * A template's bounds are the event's bounds, so a prefill can never exceed
 * them. The description has no alias of its own: `EventDescriptionField` and
 * `findDescriptionProblem` hold the one limit for both.
 */
export const EVENT_TEMPLATE_NAME_MAX_LENGTH = EVENT_NAME_MAX_LENGTH;
export const EVENT_TEMPLATE_MAX_ROLES = EVENT_MAX_VISIBILITY_ROLES;

export const EVENT_TEMPLATES_PATH = "/app/events/templates";

export const getEventTemplatePath = (templateId: string) =>
  `${EVENT_TEMPLATES_PATH}/${templateId}`;
