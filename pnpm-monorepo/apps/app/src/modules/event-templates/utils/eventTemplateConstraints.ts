import { EVENT_NAME_MAX_LENGTH } from "@sam-monorepo/domain";

/**
 * A template's bounds are the event's bounds, so a prefill can never exceed
 * them.
 */
export const EVENT_TEMPLATE_NAME_MAX_LENGTH = EVENT_NAME_MAX_LENGTH;

export const EVENT_TEMPLATES_PATH = "/app/events/templates";

export const getEventTemplatePath = (templateId: string) =>
  `${EVENT_TEMPLATES_PATH}/${templateId}`;
