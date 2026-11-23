"use client";

import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import {
  GrantValidityPreset,
  instantToWallTime,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { useState } from "react";
import {
  CUSTOM_VALIDITY_CHOICE,
  ShareGrantFormField,
} from "./shareGrantFormFields";

/** The presets of step 2. "Until the end of an event" comes in step 4. */
const VALIDITY_ITEMS = [
  {
    value: GrantValidityPreset.OneHour,
    label: "1 Stunde",
    hint: "Ab jetzt für 1 Stunde.",
  },
  {
    value: GrantValidityPreset.TwoHours,
    label: "2 Stunden",
    hint: "Ab jetzt für 2 Stunden.",
  },
  {
    value: GrantValidityPreset.NoEnd,
    label: "Ohne Ende",
    hint: "Ab jetzt, bis du die Freigabe widerrufst.",
  },
  {
    value: CUSTOM_VALIDITY_CHOICE,
    label: "Zeitraum",
    hint: "Ein eigener Start und ein eigenes Ende.",
  },
];

const VALIDITY_LABEL = "Wie lange?";

/** The validity of a new grant: a preset, or a custom start and end */
export const ValidityFields = () => {
  // The shortest preset is the default
  const [choice, setChoice] = useState<string>(GrantValidityPreset.OneHour);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const changeChoice = (nextChoice: string) => {
    setChoice(nextChoice);

    if (nextChoice === CUSTOM_VALIDITY_CHOICE && !startsAt)
      setStartsAt(instantToWallTime(new Date(), ORGANIZATION_TIMEZONE));
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1">{VALIDITY_LABEL}</p>

        <RadioGroup
          name={ShareGrantFormField.Validity}
          label={VALIDITY_LABEL}
          items={VALIDITY_ITEMS}
          value={choice}
          onChange={changeChoice}
          className="flex-wrap"
        />
      </div>

      {choice === CUSTOM_VALIDITY_CHOICE && (
        <>
          <div>
            <DateTimeInput
              label="Start"
              name={ShareGrantFormField.StartsAt}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>

          <div>
            <DateTimeInput
              label="Ende"
              name={ShareGrantFormField.EndsAt}
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              min={startsAt || undefined}
              hint="Leer: ohne Ende."
            />
          </div>

          <p className="text-xs text-white/40">
            Zeitzone: {ORGANIZATION_TIMEZONE}. Liegt der Start in der
            Vergangenheit, sieht die Freigabe auch deine hochgeladenen Einträge
            ab diesem Zeitpunkt.
          </p>
        </>
      )}
    </div>
  );
};
