import { DiscordMarkdown } from "@/modules/common/components/DiscordMarkdown";
import { getDiscordEventDescriptionFooter } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId } from "react";
import { PLACEHOLDER_EVENT_URL } from "../utils/discordEventDescription";
import { getEventUrl } from "../utils/eventConstraints";

interface Props {
  readonly className?: string;
  readonly description: string;
  /**
   * Absent while the event does not exist yet — the creation of an event, and
   * both template forms — where the preview shows the address without an
   * identifier.
   */
  readonly eventId?: string;
}

export const EventDescriptionPreview = ({
  className,
  description,
  eventId,
}: Props) => {
  const labelId = useId();

  return (
    <section aria-labelledby={labelId} className={clsx(className)}>
      <p id={labelId} className="text-white/90">
        Vorschau
      </p>

      {/*
        Focusable: the box scrolls, and only a pointer can scroll it otherwise.
        Beside the field of `EventDescriptionField`, it is as high as the field.
      */}
      <div
        tabIndex={0}
        className="mt-2 max-h-96 overflow-y-auto rounded-secondary border border-neutral-800 bg-neutral-900 p-2 outline-offset-4 outline-interaction-700 focus-visible:outline-2 @3xl:min-h-40"
      >
        {description.trim() ? (
          <DiscordMarkdown>{description}</DiscordMarkdown>
        ) : (
          <p className="text-white/40">Noch keine Kurzbeschreibung.</p>
        )}

        <div className="mt-4 border-t border-dashed border-neutral-700 pt-2">
          <p className="font-mono text-xs text-neutral-500 uppercase">
            Wird auf Discord automatisch angehängt
          </p>

          <p className="mt-1 wrap-anywhere whitespace-pre-line text-white/60">
            {getDiscordEventDescriptionFooter(
              eventId ? getEventUrl(eventId) : PLACEHOLDER_EVENT_URL,
            )}
          </p>
        </div>
      </div>
    </section>
  );
};
