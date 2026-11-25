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
  CustomValidityChoice,
  ShareGrantFormField,
  type ShareGrantValidityChoice,
} from "../../utils/shareGrantFormFields";

interface ValidityItem {
  readonly value: ShareGrantValidityChoice;
  readonly label: string;
  readonly hint: string;
}

/** The presets of step 2. "Until the end of an event" comes in step 4. */
const VALIDITY_ITEMS: ValidityItem[] = [
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
    value: CustomValidityChoice.Custom,
    label: "Zeitraum",
    hint: "Start und Ende selbst festlegen.",
  },
];

const VALIDITY_LABEL = "Wie lange?";

/** The validity of a new grant: a preset, or a custom start and end */
export const ValidityFields = () => {
  // The shortest preset is the default
  const [choice, setChoice] = useState<ShareGrantValidityChoice>(
    GrantValidityPreset.OneHour,
  );
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const changeChoice = (nextChoice: ShareGrantValidityChoice) => {
    setChoice(nextChoice);

    if (nextChoice === CustomValidityChoice.Custom && !startsAt)
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
          onChange={(nextChoice) =>
            changeChoice(nextChoice as ShareGrantValidityChoice)
          }
          className="flex-wrap"
        />
      </div>

      {choice === CustomValidityChoice.Custom && (
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
              hint="Leer lassen für kein Ende."
            />
          </div>

          <p className="text-xs text-white/40">
            Zeitzone: {ORGANIZATION_TIMEZONE}. Liegt der Start in der
            Vergangenheit, gilt die Freigabe auch für Einträge, die seitdem
            hochgeladen wurden.
          </p>
        </>
      )}
    </div>
  );
};
