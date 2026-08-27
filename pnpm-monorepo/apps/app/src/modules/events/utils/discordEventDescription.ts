import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import { getEventUrl } from "./eventConstraints";

/**
 * The note below every description the app sends to Discord. Discord's own
 * "Interested" button never reaches the app, so a reader who only presses it
 * is not a participant here.
 */
const FOOTER_TEXT = "Anmeldung nur über SAM, nicht über Discord:";

/** The empty line between the manager's own text and the note. */
const FOOTER_SEPARATOR = "\n\n";

/** The note as Discord receives it, with the event's own address below it. */
export const getDiscordEventDescriptionFooter = (eventUrl: string) =>
  `${FOOTER_TEXT}\n${eventUrl}`;

/**
 * The description of a guild scheduled event: the manager's text with the
 * note below it. An event without a description gets the note alone — a
 * reader who has no other information needs it most.
 */
export const buildDiscordEventDescription = (
  description: string | null,
  eventUrl: string,
) => {
  const footer = getDiscordEventDescriptionFooter(eventUrl);
  const text = description?.trim();

  return text ? `${text}${FOOTER_SEPARATOR}${footer}` : footer;
};

/**
 * Prisma writes an identifier of exactly this length (`cuid()`), thus the
 * length of the address in the note is known before the event exists. If this
 * ever stops being true, `findContentProblem` still measures the composed
 * text before each request and refuses the publication with a message.
 */
const EVENT_ID_LENGTH = 25;

/**
 * How many characters the note takes away from the manager. Measured, not
 * counted by hand, so a different wording keeps the number correct.
 */
const FOOTER_RESERVED_LENGTH =
  FOOTER_SEPARATOR.length +
  getDiscordEventDescriptionFooter(getEventUrl("x".repeat(EVENT_ID_LENGTH)))
    .length;

/** The limit becomes a multiple of this number, which reads better in the interface. */
const LIMIT_ROUNDING = 10;

/**
 * The limit never becomes smaller than this, so that a base address that is
 * unexpectedly long cannot make the field unusable. Such a deployment gets a
 * refused publication with an explanation instead of a field nobody can fill.
 */
const MINIMUM_LIMIT = 100;

/**
 * Discord's cap minus the note, rounded down. The limit lives here and not
 * with the other constraints of an event, because the note defines it: the
 * text of the manager and the note together must stay inside Discord's cap.
 *
 * The value depends on the deployment, because the note contains the base
 * address. A preview deployment on Vercel has a longer address than
 * production and therefore a smaller limit.
 */
export const EVENT_DESCRIPTION_MAX_LENGTH = Math.max(
  MINIMUM_LIMIT,
  Math.floor(
    (DISCORD_EVENT_DESCRIPTION_MAX_LENGTH - FOOTER_RESERVED_LENGTH) /
      LIMIT_ROUNDING,
  ) * LIMIT_ROUNDING,
);

/**
 * The address the preview shows while the event does not exist yet (the
 * event creation and both template forms). The ellipsis stands for the
 * identifier that the event gets when it is created. It is added after the
 * address is built, because `new URL()` would encode it.
 */
export const PLACEHOLDER_EVENT_URL = `${getEventUrl("")}…`;

/**
 * Why a description cannot be saved, or null when it fits. A description that
 * was stored before the limit became smaller reaches the actions untouched —
 * the browser keeps a field inside `maxLength` only while somebody types in
 * it — thus the actions must say which field is at fault. Without this the
 * manager cannot save a changed title either, and reads only "bad request".
 */
export const findDescriptionProblem = (description: string | undefined) =>
  description && description.length > EVENT_DESCRIPTION_MAX_LENGTH
    ? `Die Kurzbeschreibung ist länger als die ${EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen. Kürze sie, um zu speichern.`
    : null;
