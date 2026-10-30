import type { ApplicationErrorTexts } from "@/modules/application";
import { EVENT_TEMPLATE_ERROR_TEXTS } from "@/modules/event-templates/utils/eventTemplateErrorTexts";
import {
  EventErrorMessage,
  LineupErrorMessage,
} from "@sam-monorepo/application";
import {
  LINEUP_MAX_DEPTH,
  LINEUP_MAX_POSITIONS,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
} from "@sam-monorepo/domain";
import { DESCRIPTION_TOO_LONG_TEXT } from "./discordEventDescription";
import { PASTE_TOO_DEEP_TEXT } from "./lineupTexts";

const EVENT_NOT_FOUND_TEXT = "Event nicht gefunden";

/**
 * The texts of the event and lineup actions for the errors of the event, the
 * lineup and the template use cases. The lineup editor also changes the
 * lineups of the event templates, and an event can come from a template,
 * thus the template texts are part of it. The other validation errors need a
 * request that bypassed the forms: they get the text of a bad request.
 */
export const EVENT_ERROR_TEXTS = {
  ...EVENT_TEMPLATE_ERROR_TEXTS,
  [EventErrorMessage.NotFound]: EVENT_NOT_FOUND_TEXT,
  [EventErrorMessage.EventEnded]: "Das Event ist bereits vorbei.",
  // The forms show only the lineup switch for a Discord event
  [EventErrorMessage.DiscordEvent]: EVENT_NOT_FOUND_TEXT,
  // Not reached: the actions carry the change over to Discord themselves
  [EventErrorMessage.PublishedOnDiscord]:
    "Das Event ist auf Discord veröffentlicht.",
  [EventErrorMessage.ParticipationClosed]: "Die Anmeldung ist geschlossen.",
  [EventErrorMessage.ParticipationDisabled]:
    "Die Teilnahme an diesem Event ist abgeschaltet.",
  [EventErrorMessage.AlreadySignedUp]: "Du bist bereits angemeldet.",
  [EventErrorMessage.NotSignedUp]: "Du bist nicht angemeldet.",
  [EventErrorMessage.CitizenNotSignedUp]: "Der Citizen ist nicht angemeldet.",
  [EventErrorMessage.CitizenNotManager]:
    "Der Citizen ist kein Manager des Events.",
  [EventErrorMessage.EndBeforeStart]: "Das Ende muss nach dem Start liegen.",
  [EventErrorMessage.DescriptionTooLong]: DESCRIPTION_TOO_LONG_TEXT,
  [EventErrorMessage.NoVisibilityRole]: "Wähle mindestens eine Rolle aus.",
  [EventErrorMessage.InvalidCoverImage]: "Ungültiges Titelbild",
  [EventErrorMessage.NoCitizenSelected]:
    "Bitte wähle mindestens einen Citizen aus.",
  [EventErrorMessage.CitizenCannotSeeEvent]:
    "Mindestens ein Citizen kann das Event nicht sehen.",
  [EventErrorMessage.AlreadyPublishedOnDiscord]:
    "Das Event ist bereits auf Discord veröffentlicht.",
  [EventErrorMessage.DiscordChannelUnavailable]:
    "Der ausgewählte Kanal steht nicht (mehr) zur Verfügung. Lade die Seite neu.",
  [LineupErrorMessage.PositionNotFound]: "Posten nicht gefunden",
  [LineupErrorMessage.LineupChanged]:
    "Die Aufstellung wurde in der Zwischenzeit geändert.",
  [LineupErrorMessage.LineupTooDeep]: `Es sind maximal ${LINEUP_MAX_DEPTH} Ebenen möglich.`,
  [LineupErrorMessage.TooManyPositionsOnLevel]: `Auf dieser Ebene sind maximal ${LINEUP_MAX_POSITIONS_PER_LEVEL} Posten möglich.`,
  [LineupErrorMessage.TooManyPositions]: `Die Aufstellung hat maximal ${LINEUP_MAX_POSITIONS} Posten.`,
  [LineupErrorMessage.VariantNotFound]: "Schiff nicht gefunden",
  [LineupErrorMessage.CitizenNotFound]: "Citizen nicht gefunden",
  [LineupErrorMessage.CitizenNotParticipating]:
    "Der Citizen ist nicht für dieses Event angemeldet und hat kein Interesse für diesen Posten angemeldet.",
  [LineupErrorMessage.NotParticipating]:
    "Du bist nicht für dieses Event angemeldet.",
  [LineupErrorMessage.NotApplied]:
    "Du hast für diesen Posten kein Interesse angemeldet.",
  [LineupErrorMessage.PasteTooDeep]: PASTE_TOO_DEEP_TEXT,
} satisfies ApplicationErrorTexts;
