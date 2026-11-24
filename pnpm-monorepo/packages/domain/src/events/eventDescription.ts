import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "../discord/guildScheduledEvent.js";

/**
 * The note below every description the app sends to Discord. Discord's own
 * "Interested" button never reaches the app, so a reader who only presses it
 * is not a participant here.
 */
const FOOTER_TEXT = "Anmeldung nur über SAM, nicht über Discord:";

const FOOTER_SEPARATOR = "\n\n";

export const getDiscordEventDescriptionFooter = (eventUrl: string) =>
  `${FOOTER_TEXT}\n${eventUrl}`;

/**
 * An event without a description gets the note alone — a reader who has no
 * other information needs it most.
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
 * ever stops being true, the app still measures the composed text before each
 * request to Discord and refuses the publication with a message.
 */
const EVENT_ID_LENGTH = 25;

/** The limit becomes a multiple of this number, which reads better in the interface. */
const LIMIT_ROUNDING = 10;

/**
 * The limit never becomes smaller than this, so that a base address that is
 * unexpectedly long cannot make the field unusable. Such a deployment gets a
 * refused publication with an explanation instead of a field nobody can fill.
 */
const MINIMUM_LIMIT = 100;

/**
 * Discord's cap minus the note, rounded down.
 *
 * The value depends on the deployment, because the note contains the base
 * address. A preview deployment on Vercel has a longer address than production
 * and therefore a smaller limit.
 */
export const getEventDescriptionMaxLength = (
  getEventUrl: (eventId: string) => string,
) => {
  const footerReservedLength =
    FOOTER_SEPARATOR.length +
    getDiscordEventDescriptionFooter(getEventUrl("x".repeat(EVENT_ID_LENGTH)))
      .length;

  return Math.max(
    MINIMUM_LIMIT,
    Math.floor(
      (DISCORD_EVENT_DESCRIPTION_MAX_LENGTH - footerReservedLength) /
        LIMIT_ROUNDING,
    ) * LIMIT_ROUNDING,
  );
};
