"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { EventTemplateDescriptionHint } from "@/modules/event-templates/components/EventTemplateDescriptionHint";
import { EventCoverImageField } from "@/modules/events/components/EventCoverImageField";
import { EventDescriptionField } from "@/modules/events/components/EventDescriptionField";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { createEventTemplate } from "../actions/createEventTemplate";
import { EVENT_TEMPLATE_NAME_MAX_LENGTH } from "../utils/eventTemplateConstraints";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

/**
 * Creates a template with the fields an event starts from. Lineup, briefing
 * and the visibility prefill are edited on the template's own pages, where
 * the action redirects to.
 */
export const CreateEventTemplateForm = ({ className, onSuccess }: Props) => {
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(createEventTemplate, {
      errorToast: false,
      onSuccess,
    });

  return (
    <form action={formAction} className={clsx(className)}>
      <TextInput
        name="name"
        label="Name"
        hint="Benennt die Vorlage und wird als Titel in das Event übernommen."
        maxLength={EVENT_TEMPLATE_NAME_MAX_LENGTH}
        defaultValue={getDefaultValueWithFallback("name", "")}
        required
        autoFocus
      />

      <EventDescriptionField
        hint={<EventTemplateDescriptionHint />}
        defaultValue={getDefaultValueWithFallback("description", "")}
        className="mt-4"
      />

      <EventCoverImageField name="coverImageId" className="mt-4" />

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
