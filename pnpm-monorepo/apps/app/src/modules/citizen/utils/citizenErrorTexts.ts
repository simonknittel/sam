import type { ApplicationErrorTexts } from "@/modules/application";
import {
  CitizenErrorMessage,
  CitizenLogErrorMessage,
} from "@sam-monorepo/application";

export const CITIZEN_ERROR_TEXTS: ApplicationErrorTexts = {
  [CitizenErrorMessage.BirthdayIncomplete]:
    "Gib für den Geburtstag den Tag und den Monat an.",
  [CitizenErrorMessage.BirthdayDayNotInMonth]:
    "Diesen Tag gibt es in dem gewählten Monat nicht.",
  [CitizenLogErrorMessage.OwnDiscordId]:
    "Du kannst deine eigene Discord ID nicht bestätigen. Das muss eine andere Person tun.",
  [CitizenLogErrorMessage.DiscordIdTaken]:
    "Diese Discord ID gehört bereits zu einem anderen Citizen.",
  [CitizenLogErrorMessage.AlreadyDecided]:
    "Über diesen Eintrag wurde bereits entschieden.",
};
