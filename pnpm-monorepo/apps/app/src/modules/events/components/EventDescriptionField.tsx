"use client";

import { DiscordMarkdown } from "@/modules/common/components/DiscordMarkdown";
import { Textarea } from "@/modules/common/components/form/Textarea";
import clsx from "clsx";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import {
  getDiscordEventDescriptionFooter,
  PLACEHOLDER_EVENT_URL,
} from "../utils/discordEventDescription";
import { getEventUrl } from "../utils/eventConstraints";

export enum EventDescriptionPreviewLayout {
  /** For a narrow container, e.g. a modal. */
  Below = "below",
  /** Beside the field from the `md` breakpoint, below it before that. */
  Beside = "beside",
}

interface Props {
  readonly className?: string;
  readonly hint: ReactNode;
  readonly maxLength: number;
  /** What the DOM accepts, so that `getDefaultValueWithFallback` fits. */
  readonly defaultValue: ComponentProps<"textarea">["defaultValue"];
  readonly previewLayout: EventDescriptionPreviewLayout;
  /**
   * The event the note links to. Absent while the event does not exist yet —
   * the creation of an event, and both template forms — where the preview
   * shows the address without an identifier.
   */
  readonly eventId?: string;
}

/**
 * The text of the field, which the preview renders and the counter measures.
 * A form gives what the DOM accepts, and only a string can be either.
 */
const toText = (value: Props["defaultValue"]) =>
  typeof value === "string" ? value : (value?.toString() ?? "");

/**
 * The description of an event or of a template, with a preview of the text as
 * Discord shows it. The preview also shows the sign-up note that the app
 * appends, which the manager cannot change.
 */
export const EventDescriptionField = ({
  className,
  hint,
  maxLength,
  defaultValue,
  previewLayout,
  eventId,
}: Props) => {
  const counterId = useId();
  const previewLabelId = useId();
  const defaultText = toText(defaultValue);
  const [description, setDescription] = useState(defaultText);

  /**
   * React puts the form back to its default values after an action, and a
   * saved event arrives as a new default value. The field is uncontrolled —
   * a controlled one loses its text at that reset — thus the preview follows
   * the default value the way React documents it, with an adjustment during
   * the render instead of an effect.
   */
  const [previousDefaultText, setPreviousDefaultText] = useState(defaultText);
  if (defaultText !== previousDefaultText) {
    setPreviousDefaultText(defaultText);
    setDescription(defaultText);
  }

  const isBeside = previewLayout === EventDescriptionPreviewLayout.Beside;
  const isOverLimit = description.length > maxLength;

  return (
    <div
      className={clsx(className, isBeside && "md:flex md:items-start md:gap-4")}
    >
      <div className={clsx(isBeside && "md:min-w-0 md:flex-1")}>
        <Textarea
          name="description"
          label="Kurzbeschreibung"
          hint={
            <span className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span>{hint}</span>

              <span
                id={counterId}
                className={clsx(
                  "ml-auto shrink-0 tabular-nums",
                  isOverLimit && "text-brand-red-500",
                )}
              >
                {description.length.toLocaleString("de-DE")} /{" "}
                {maxLength.toLocaleString("de-DE")}
                {/* Never the colour alone — it says what is wrong as well */}
                {isOverLimit && " – zu lang"}
              </span>
            </span>
          }
          aria-describedby={counterId}
          maxLength={maxLength}
          defaultValue={defaultValue}
          onChange={(event) => setDescription(event.target.value)}
          classNameTextarea="h-40"
        />
      </div>

      <section
        aria-labelledby={previewLabelId}
        className={clsx(
          isBeside ? "mt-4 md:mt-0 md:min-w-0 md:flex-1" : "mt-4",
        )}
      >
        <p id={previewLabelId} className="block text-white/90">
          Vorschau
        </p>

        <div className="mt-2 max-h-96 overflow-y-auto rounded-secondary border border-neutral-800 bg-neutral-900 p-2 md:min-h-40">
          {description.trim() ? (
            <DiscordMarkdown>{description}</DiscordMarkdown>
          ) : (
            <p className="text-white/40">Noch keine Kurzbeschreibung.</p>
          )}

          <div className="mt-4 border-t border-dashed border-neutral-700 pt-2">
            <p className="font-mono text-xs uppercase text-neutral-500">
              Wird auf Discord automatisch angehängt
            </p>

            <p
              className="mt-1 whitespace-pre-line text-white/60"
              style={{ overflowWrap: "anywhere" }}
            >
              {getDiscordEventDescriptionFooter(
                eventId ? getEventUrl(eventId) : PLACEHOLDER_EVENT_URL,
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
