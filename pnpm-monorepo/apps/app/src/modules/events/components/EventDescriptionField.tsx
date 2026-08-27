"use client";

import { DiscordMarkdown } from "@/modules/common/components/DiscordMarkdown";
import { DiscordFormattingHint } from "@/modules/common/components/form/DiscordFormattingHint";
import { Textarea } from "@/modules/common/components/form/Textarea";
import clsx from "clsx";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  EVENT_DESCRIPTION_MAX_LENGTH,
  getDiscordEventDescriptionFooter,
  PLACEHOLDER_EVENT_URL,
} from "../utils/discordEventDescription";
import { getEventUrl } from "../utils/eventConstraints";

interface Props {
  readonly className?: string;
  /** What this description is used for, said after the shared hint. */
  readonly hint: ReactNode;
  /** Accepts the union returned by `getDefaultValueWithFallback` */
  readonly defaultValue?: string | number | readonly string[];
  /**
   * The event the note links to. Absent while the event does not exist yet —
   * the creation of an event, and both template forms — where the preview
   * shows the address without an identifier.
   */
  readonly eventId?: string;
}

/**
 * The description of an event or of a template, with a preview of the text as
 * Discord shows it. The preview also shows the sign-up note that the app
 * appends, which the manager cannot change.
 *
 * The preview goes beside the field where there is room for two columns and
 * below it where there is not. A container query decides that, because a
 * modal stays narrow however wide the window is.
 */
export const EventDescriptionField = ({
  className,
  hint,
  defaultValue,
  eventId,
}: Props) => {
  const counterId = useId();
  const previewLabelId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const defaultText = typeof defaultValue === "string" ? defaultValue : "";
  const [description, setDescription] = useState(defaultText);

  /**
   * The field is uncontrolled, because a controlled one loses its text when
   * React puts the form back to its default values after an action. The
   * preview therefore follows the field in two steps. First the reset, which
   * gives the field the default value of that moment — the event comes
   * before the values change, thus the field is read after the browser has
   * finished.
   */
  useEffect(() => {
    const form = textareaRef.current?.form;
    if (!form) return;

    const handleReset = () =>
      setTimeout(() => {
        if (textareaRef.current) setDescription(textareaRef.current.value);
      });

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  /**
   * And second a new default value, which a saved event brings a moment
   * after the reset. Adjusting during the render is how React documents it.
   */
  const [previousDefaultText, setPreviousDefaultText] = useState(defaultText);
  if (defaultText !== previousDefaultText) {
    setPreviousDefaultText(defaultText);
    setDescription(defaultText);
  }

  const isOverLimit = description.length > EVENT_DESCRIPTION_MAX_LENGTH;

  return (
    /* The query measures this element, thus the two columns are one inside it */
    <div className={clsx("@container", className)}>
      <div className="@3xl:flex @3xl:items-start @3xl:gap-4">
        <div className="@3xl:min-w-0 @3xl:flex-1">
          <Textarea
            name="description"
            label="Kurzbeschreibung"
            hint={
              <span className="flex flex-wrap items-baseline gap-x-4">
                <span>
                  optional, max.{" "}
                  {EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen
                  &ndash; der Rest ist für den Hinweis zur Anmeldung reserviert,
                  den Discord automatisch erhält. <DiscordFormattingHint />.{" "}
                  {hint}
                </span>

                <span
                  id={counterId}
                  className={clsx(
                    "ml-auto shrink-0 tabular-nums",
                    isOverLimit && "text-brand-red-500",
                  )}
                >
                  {description.length.toLocaleString("de-DE")} /{" "}
                  {EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")}
                  {/* Never the colour alone — it says what is wrong as well */}
                  {isOverLimit && " – zu lang"}
                </span>
              </span>
            }
            aria-describedby={counterId}
            maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
            ref={textareaRef}
            defaultValue={defaultValue}
            onChange={(event) => setDescription(event.target.value)}
            classNameTextarea="h-40"
          />
        </div>

        <section
          aria-labelledby={previewLabelId}
          className="mt-4 @3xl:mt-0 @3xl:min-w-0 @3xl:flex-1"
        >
          <p id={previewLabelId} className="text-white/90">
            Vorschau
          </p>

          {/* Focusable: the box scrolls, and only a pointer can scroll it otherwise */}
          <div
            tabIndex={0}
            className="mt-2 max-h-96 overflow-y-auto rounded-secondary border border-neutral-800 bg-neutral-900 p-2 outline-interaction-700 outline-offset-4 focus-visible:outline-2 @3xl:min-h-40"
          >
            {description.trim() ? (
              <DiscordMarkdown>{description}</DiscordMarkdown>
            ) : (
              <p className="text-white/40">Noch keine Kurzbeschreibung.</p>
            )}

            <div className="mt-4 border-t border-dashed border-neutral-700 pt-2">
              <p className="font-mono text-xs uppercase text-neutral-500">
                Wird auf Discord automatisch angehängt
              </p>

              <p className="mt-1 whitespace-pre-line wrap-anywhere text-white/60">
                {getDiscordEventDescriptionFooter(
                  eventId ? getEventUrl(eventId) : PLACEHOLDER_EVENT_URL,
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
