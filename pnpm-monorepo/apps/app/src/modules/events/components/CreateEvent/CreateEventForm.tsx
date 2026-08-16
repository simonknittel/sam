"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { createEvent } from "@/modules/events/actions/createEvent";
import { WikiRoleSelector } from "@/modules/wiki/components/WikiRoleSelector";
import { EventVisibility } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaGlobe, FaLock, FaSave } from "react-icons/fa";
import { EventCoverImageField } from "../EventCoverImageField";
import { EventDateTimeField } from "../EventDateTimeField";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateEventForm = ({ className, onSuccess }: Props) => {
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(createEvent, {
      errorToast: false,
      onSuccess,
    });
  const [visibility, setVisibility] = useState<string>(EventVisibility.PUBLIC);

  return (
    <form action={formAction} className={clsx(className)}>
      <TextInput
        name="name"
        label="Titel"
        maxLength={128}
        defaultValue={getDefaultValueWithFallback("name", "")}
        required
        autoFocus
      />

      <Textarea
        name="description"
        label="Kurzbeschreibung"
        hint="optional, max. 2.000 Zeichen, keine Formatierungsmöglichkeiten. Ausführlichere Informationen gehören ins Briefing (Event-Wiki) des Events."
        maxLength={2000}
        defaultValue={getDefaultValueWithFallback("description", "")}
        className="mt-4"
        classNameTextarea="h-40"
      />

      <EventCoverImageField name="coverImageId" className="mt-4" />

      <EventDateTimeField
        name="startTime"
        label="Start"
        defaultValue={getDefaultValueWithFallback("startTime", "")}
        className="mt-4"
        required
      />

      <EventDateTimeField
        name="endTime"
        label="Ende"
        defaultValue={getDefaultValueWithFallback("endTime", "")}
        className="mt-4"
        required
      />

      <p className="mt-4">Sichtbarkeit</p>
      <RadioGroup
        name="visibility"
        items={[
          {
            value: EventVisibility.PUBLIC,
            label: "Öffentlich",
            icon: <FaGlobe />,
            hint: "Alle mit Events-Berechtigung können das Event sehen.",
          },
          {
            value: EventVisibility.RESTRICTED,
            label: "Eingeschränkt",
            icon: <FaLock />,
            hint: "Nur ausgewählte Rollen sowie die Organisatoren können das Event sehen.",
          },
        ]}
        value={visibility}
        onChange={setVisibility}
        className="mt-2"
      />

      {visibility === EventVisibility.RESTRICTED && (
        <WikiRoleSelector inputName="visibilityRole[]" className="mt-2" />
      )}

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
