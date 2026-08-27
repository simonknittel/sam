import { DiscordFormattingHint } from "@/modules/common/components/form/DiscordFormattingHint";
import { EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH } from "@/modules/event-templates/utils/eventTemplateConstraints";

/** The hint below the description field of an event template. */
export const EventTemplateDescriptionHint = () => {
  return (
    <>
      optional, max.{" "}
      {EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen
      &ndash; der Rest ist für den Hinweis zur Anmeldung reserviert, den Discord
      automatisch erhält. <DiscordFormattingHint />. Wird als Kurzbeschreibung
      in das Event übernommen.
    </>
  );
};
