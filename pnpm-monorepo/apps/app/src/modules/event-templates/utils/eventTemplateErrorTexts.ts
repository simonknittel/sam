import type { ApplicationErrorTexts } from "@/modules/application";
import {
  EventTemplateErrorMessage,
  UploadErrorMessage,
} from "@sam-monorepo/application";

/**
 * `UnknownRole` needs a request that bypassed the form: it gets the text of a
 * bad request. `EVENT_ERROR_TEXTS` spreads this record, thus it must not import
 * the event texts.
 */
export const EVENT_TEMPLATE_ERROR_TEXTS: ApplicationErrorTexts = {
  [EventTemplateErrorMessage.NotFound]: "Vorlage nicht gefunden",
  [EventTemplateErrorMessage.Deleted]: "Die Vorlage ist gelöscht.",
  [EventTemplateErrorMessage.OwnerNotFound]: "Citizen nicht gefunden",
  [EventTemplateErrorMessage.ChannelMissing]: "Wähle einen Discord-Kanal aus.",
  // A copy of a template or of an event copies its cover image
  [UploadErrorMessage.StorageNotConfigured]:
    "Der Dateispeicher ist nicht konfiguriert.",
};
