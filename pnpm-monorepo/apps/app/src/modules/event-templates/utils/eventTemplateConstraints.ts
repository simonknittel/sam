/** Same bounds the event form uses, so a prefill can never exceed them */
export const EVENT_TEMPLATE_NAME_MAX_LENGTH = 128;
export const EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Arbitrary (untested) caps so a hostile client cannot make one request
 * write thousands of rows.
 */
export const EVENT_TEMPLATE_MAX_ROLES = 50;

export const EVENT_TEMPLATES_PATH = "/app/events/templates";

export const getEventTemplatePath = (templateId: string) =>
  `${EVENT_TEMPLATES_PATH}/${templateId}`;
