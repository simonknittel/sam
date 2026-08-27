import { EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/events/utils/discordEventDescription";
import {
  EVENT_MAX_VISIBILITY_ROLES,
  EVENT_NAME_MAX_LENGTH,
} from "@/modules/events/utils/eventConstraints";

/**
 * A template's bounds are the event's bounds, so a prefill can never exceed
 * them — including the description cap Discord imposes on published events.
 */
export const EVENT_TEMPLATE_NAME_MAX_LENGTH = EVENT_NAME_MAX_LENGTH;
export const EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH =
  EVENT_DESCRIPTION_MAX_LENGTH;
export const EVENT_TEMPLATE_MAX_ROLES = EVENT_MAX_VISIBILITY_ROLES;

export const EVENT_TEMPLATES_PATH = "/app/events/templates";

export const getEventTemplatePath = (templateId: string) =>
  `${EVENT_TEMPLATES_PATH}/${templateId}`;
