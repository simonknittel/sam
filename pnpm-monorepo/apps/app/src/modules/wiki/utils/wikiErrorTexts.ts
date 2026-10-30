import type { ApplicationErrorTexts } from "@/modules/application";
import { WikiErrorMessage } from "@sam-monorepo/application";

const COLLAB_UNREACHABLE_TEXT =
  "der Collaboration-Server ist nicht erreichbar. Bitte versuche es später erneut.";

/**
 * The texts of the wiki actions for the errors of the wiki use cases. The
 * not-found messages without an own text get the common not-found text. The
 * permissions action builds the text of `RolesCannotReadParent` with the
 * names of the roles (see `WikiRolesCannotReadParentError`).
 */
export const WIKI_ERROR_TEXTS = {
  [WikiErrorMessage.SourcePageNotFound]:
    "Die kopierte Seite existiert nicht mehr oder ist für dich nicht sichtbar.",
  [WikiErrorMessage.BriefingFrozen]: "Das Event ist bereits vorbei.",
  [WikiErrorMessage.PageTreeChanged]:
    "Die Seitenstruktur war veraltet. Sie ist jetzt aktuell, bitte versuche es erneut.",
  [WikiErrorMessage.TrashChanged]:
    "Der Papierkorb war veraltet. Er ist jetzt aktuell, bitte versuche es erneut.",
  [WikiErrorMessage.CollabNotConfigured]:
    "Der Collaboration-Server ist nicht konfiguriert.",
  [WikiErrorMessage.ReplaceFailed]: `Ersetzen fehlgeschlagen — ${COLLAB_UNREACHABLE_TEXT}`,
  [WikiErrorMessage.SnapshotRestoreFailed]: `Wiederherstellen fehlgeschlagen — ${COLLAB_UNREACHABLE_TEXT}`,
  [WikiErrorMessage.ImportFailed]: `Import fehlgeschlagen — ${COLLAB_UNREACHABLE_TEXT}`,
  [WikiErrorMessage.SnapshotIncompatible]:
    "Der Snapshot ist mit der aktuellen Editor-Version nicht mehr kompatibel.",
  [WikiErrorMessage.InvalidImportFile]:
    "Die Datei ist kein gültiges Wiki-Dokument (Tiptap JSON) oder enthält nicht unterstützte Inhalte.",
  [WikiErrorMessage.CannotReplaceWithItself]:
    "Eine Seite kann nicht durch sich selbst ersetzt werden.",
  [WikiErrorMessage.EditScopeWiderThanReadScope]:
    "Bearbeiten darf nicht mehr Personen umfassen als Lesen.",
  [WikiErrorMessage.ParticipationScopeUnavailable]:
    "Die Teilnahme an diesem Event ist abgeschaltet. Teilnehmer und Aufstellung stehen deshalb nicht zur Auswahl.",
  [WikiErrorMessage.OwnerCannotReadParent]:
    "Der ausgewählte Besitzer darf die übergeordnete Seite nicht lesen und hätte deshalb keinen Zugriff auf diese Seite.",
  [WikiErrorMessage.TooManyOpenReports]:
    "Du hast bereits zu viele offene Meldungen. Bitte warte, bis diese bearbeitet wurden.",
  [WikiErrorMessage.ReportAlreadyResolved]:
    "Diese Meldung wurde bereits bearbeitet.",
  [WikiErrorMessage.IframeSourceNotAllowed]:
    "Diese URL wird nicht unterstützt. Möglich sind YouTube, Twitch, Spotify, Google Docs/Tabellen/Präsentationen sowie Domains, die in den Wiki-Einstellungen freigegeben sind.",
} satisfies ApplicationErrorTexts;
