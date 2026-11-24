import { getEventDescriptionMaxLength } from "@sam-monorepo/domain";
import { getEventUrl } from "./eventConstraints";

/** The use cases of the events check the same limit */
export const EVENT_DESCRIPTION_MAX_LENGTH =
  getEventDescriptionMaxLength(getEventUrl);

/**
 * The address the preview shows while the event does not exist yet (the
 * event creation and both template forms). The ellipsis stands for the
 * identifier that the event gets when it is created. It is added after the
 * address is built, because `new URL()` would encode it.
 */
export const PLACEHOLDER_EVENT_URL = `${getEventUrl("")}…`;

/**
 * A description that was stored before the limit became smaller reaches the
 * actions untouched — the browser keeps a field inside `maxLength` only while
 * somebody types in it — thus the text must say which field is at fault.
 */
export const DESCRIPTION_TOO_LONG_TEXT = `Die Kurzbeschreibung ist länger als die ${EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen. Kürze sie, um zu speichern.`;
