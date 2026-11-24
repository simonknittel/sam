import "server-only";

import {
  DiscordSyncOutcome,
  EventErrorMessage,
  type DiscordSyncResult,
} from "@sam-monorepo/application";
import {
  DISCORD_EVENT_LOCATION_MAX_LENGTH,
  DISCORD_EVENT_NAME_MAX_LENGTH,
  GuildScheduledEventContentProblem,
} from "@sam-monorepo/domain";
import { EVENT_DESCRIPTION_MAX_LENGTH } from "./discordEventDescription";
import { EVENT_ERROR_TEXTS } from "./eventErrorTexts";

const getProblemMessage = (problem: GuildScheduledEventContentProblem) => {
  switch (problem) {
    case GuildScheduledEventContentProblem.MissingEndTime:
      return "Das Event braucht ein Ende, um auf Discord veröffentlicht werden zu können.";

    case GuildScheduledEventContentProblem.NameTooLong:
      return `Der Titel ist länger als die ${DISCORD_EVENT_NAME_MAX_LENGTH} Zeichen, die Discord erlaubt. Kürze ihn, um das Event auf Discord zu veröffentlichen.`;

    case GuildScheduledEventContentProblem.DescriptionTooLong:
      return `Die Kurzbeschreibung ist länger als die ${EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen. Kürze sie, um das Event auf Discord zu veröffentlichen.`;

    case GuildScheduledEventContentProblem.LocationTooLong:
      return `Der Ort ist länger als die ${DISCORD_EVENT_LOCATION_MAX_LENGTH} Zeichen, die Discord erlaubt.`;

    case GuildScheduledEventContentProblem.StartInThePast:
      return "Discord akzeptiert nur Events, die in der Zukunft starten.";

    case GuildScheduledEventContentProblem.EndBeforeStart:
      return "Das Ende muss nach dem Start liegen.";

    default:
      throw new Error(`Unknown problem: ${problem satisfies never}`);
  }
};

export const getDiscordSyncWarning = (result: DiscordSyncResult) => {
  switch (result.outcome) {
    case DiscordSyncOutcome.Skipped:
    case DiscordSyncOutcome.Done:
      return null;

    case DiscordSyncOutcome.Cleared:
      return "Das Event existiert auf Discord nicht mehr und gilt hier wieder als nicht veröffentlicht.";

    case DiscordSyncOutcome.Rejected:
      return `Discord wurde nicht aktualisiert: ${getProblemMessage(result.problem)}`;

    case DiscordSyncOutcome.Failed:
      return "Discord konnte nicht aktualisiert werden. Die Änderung wurde trotzdem gespeichert.";

    default:
      throw new Error(`Unknown outcome: ${result satisfies never}`);
  }
};

/**
 * Reported where the cover image is what the manager just acted on —
 * publishing, or replacing the cover. Deliberately not part of
 * `getDiscordSyncWarning`: an unsupported cover would otherwise nag on every
 * unrelated edit of the event.
 */
export const getDiscordCoverImageWarning = (result: DiscordSyncResult) =>
  result.outcome === DiscordSyncOutcome.Done && result.isCoverImageSkipped
    ? "Das Titelbild konnte nicht an Discord übertragen werden. Discord akzeptiert nur JPEG, PNG und GIF, und das Bild darf nicht zu groß sein."
    : null;

export const getDiscordPublishError = (result: DiscordSyncResult) => {
  switch (result.outcome) {
    case DiscordSyncOutcome.Skipped:
      return EVENT_ERROR_TEXTS[EventErrorMessage.NotFound];

    case DiscordSyncOutcome.Rejected:
      return getProblemMessage(result.problem);

    case DiscordSyncOutcome.Failed:
      return "Discord konnte nicht erreicht werden. Versuche es später erneut.";

    case DiscordSyncOutcome.Done:
    case DiscordSyncOutcome.Cleared:
      return null;

    default:
      throw new Error(`Unknown outcome: ${result satisfies never}`);
  }
};
