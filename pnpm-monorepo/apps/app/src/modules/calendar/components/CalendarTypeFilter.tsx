"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { CalendarEntryTypeSetting } from "@sam-monorepo/application";
import clsx from "clsx";
import { startTransition, useId, type FormEvent } from "react";
import { updateMyCalendarEntryTypeSettings } from "../actions/updateMyCalendarEntryTypeSettings";
import { CALENDAR_ENTRY_TYPE_LABELS } from "../utils/calendarEntryTypeLabels";
import { CalendarEntryTypeIcon } from "./CalendarEntryTypeIcon";

interface Props {
  readonly className?: string;
  /** The types that the viewer can read */
  readonly settings: readonly CalendarEntryTypeSetting[];
  /** False for a viewer without a citizen: such a viewer has no settings */
  readonly canSave: boolean;
}

/**
 * One checkbox for each entry type that the viewer can read. Each change is
 * saved at once for the citizen, thus the selection also applies to the
 * dashboard tile and to the other devices.
 */
export const CalendarTypeFilter = ({ className, settings, canSave }: Props) => {
  const { state, formAction } = useAction(updateMyCalendarEntryTypeSettings, {
    errorToast: false,
  });

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);

    startTransition(() => formAction(formData));
  };

  return (
    <form
      onChange={handleChange}
      className={clsx("corners-secondary bg-secondary p-2", className)}
    >
      <fieldset>
        <legend className="font-mono text-sm text-white/40 uppercase">
          Typen
        </legend>

        <div className="mt-1 flex flex-col gap-2">
          {settings.map((setting) => (
            <CalendarTypeField
              key={setting.type}
              setting={setting}
              disabled={!canSave}
            />
          ))}
        </div>
      </fieldset>

      {!canSave && (
        <p className="mt-2 text-sm text-neutral-500">
          Ohne Citizen kannst du die Auswahl nicht ändern.
        </p>
      )}

      <ActionErrorNote className="mt-2" state={state} />
    </form>
  );
};

interface CalendarTypeFieldProps {
  readonly setting: CalendarEntryTypeSetting;
  readonly disabled: boolean;
}

const CalendarTypeField = ({ setting, disabled }: CalendarTypeFieldProps) => {
  const inputId = useId();

  return (
    <div className="flex w-full items-start justify-between gap-4">
      {/* The padding centers the first line (1.5rem) on the checkbox (2rem) */}
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-start gap-2 py-1"
      >
        <span className="flex h-lh flex-none items-center">
          <CalendarEntryTypeIcon
            type={setting.type}
            className="text-neutral-500"
          />
        </span>
        {CALENDAR_ENTRY_TYPE_LABELS[setting.type]}
      </label>

      <YesNoCheckbox
        /**
         * The key carries the stored state: a render with new data from the
         * server mounts the box again, thus the stored state wins over the
         * state the browser holds for the element.
         */
        key={`${setting.type}:${String(setting.enabled)}`}
        id={inputId}
        name={setting.type}
        value="true"
        defaultChecked={setting.enabled}
        disabled={disabled}
        hideLabel
        className="flex-none"
      />
    </div>
  );
};
