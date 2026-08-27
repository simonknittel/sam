import { DiscordFormattingHint } from "@/modules/common/components/form/DiscordFormattingHint";
import { EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/events/utils/discordEventDescription";

/** The hint below the description field of an event. */
export const EventDescriptionHint = () => {
  return (
    <>
      optional, max. {EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")}{" "}
      Zeichen &ndash; der Rest ist für den Hinweis zur Anmeldung reserviert, den
      Discord automatisch erhält. <DiscordFormattingHint />. Ausführlichere
      Informationen gehören ins Briefing des Events.
    </>
  );
};
