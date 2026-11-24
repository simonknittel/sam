"use client";

import { DiscordFormattingHint } from "@/modules/common/components/form/DiscordFormattingHint";
import { Textarea } from "@/modules/common/components/form/Textarea";
import clsx from "clsx";
import { useId, type ReactNode, type Ref } from "react";
import { useEventDescription } from "../hooks/useEventDescription";
import { EVENT_DESCRIPTION_MAX_LENGTH } from "../utils/discordEventDescription";
import { EventDescriptionPreview } from "./EventDescriptionPreview";

interface TextareaProps {
  readonly className?: string;
  readonly hint: ReactNode;
  readonly defaultValue?: string | number | readonly string[];
  readonly description: string;
  readonly onDescriptionChange: (description: string) => void;
  readonly ref: Ref<HTMLTextAreaElement>;
}

/**
 * Without the preview, which is only for Discord: a form with a Discord part
 * shows it there (see `EventDescriptionPreview`).
 */
export const EventDescriptionTextarea = ({
  className,
  hint,
  defaultValue,
  description,
  onDescriptionChange,
  ref,
}: TextareaProps) => {
  const counterId = useId();
  const isOverLimit = description.length > EVENT_DESCRIPTION_MAX_LENGTH;

  return (
    <div className={clsx(className)}>
      <Textarea
        name="description"
        label="Öffentliche Kurzbeschreibung"
        hint={
          <span className="flex flex-wrap items-baseline gap-x-4">
            <span>
              optional, max.{" "}
              {EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen
              &ndash; der Rest ist für den Hinweis zur Anmeldung reserviert, den
              Discord automatisch erhält. <DiscordFormattingHint /> {hint}
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
        ref={ref}
        defaultValue={defaultValue}
        onChange={(event) => onDescriptionChange(event.target.value)}
        classNameTextarea="h-40"
      />
    </div>
  );
};

interface Props {
  readonly className?: string;
  readonly hint: ReactNode;
  readonly defaultValue?: string | number | readonly string[];
  /** See `EventDescriptionPreview` */
  readonly eventId?: string;
}

/**
 * The preview goes beside the field where there is room for two columns and
 * below it where there is not. A container query decides that, because a modal
 * stays narrow however wide the window is.
 */
export const EventDescriptionField = ({
  className,
  hint,
  defaultValue,
  eventId,
}: Props) => {
  const { description, setDescription, textareaRef } =
    useEventDescription(defaultValue);

  return (
    /* The query measures this element, thus the two columns are one inside it */
    <div className={clsx("@container", className)}>
      <div className="@3xl:flex @3xl:items-start @3xl:gap-4">
        <EventDescriptionTextarea
          hint={hint}
          defaultValue={defaultValue}
          description={description}
          onDescriptionChange={setDescription}
          ref={textareaRef}
          className="@3xl:min-w-0 @3xl:flex-1"
        />

        <EventDescriptionPreview
          description={description}
          eventId={eventId}
          className="mt-4 @3xl:mt-0 @3xl:min-w-0 @3xl:flex-1"
        />
      </div>
    </div>
  );
};
