"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { SeasonalEventKey } from "@sam-monorepo/domain";
import clsx from "clsx";
import { debounce } from "lodash";
import {
  startTransition,
  useEffect,
  useId,
  useMemo,
  type FormEvent,
} from "react";
import { updateMySeasonalThemeSettings } from "../actions/updateMySeasonalThemeSettings";

/**
 * Milliseconds the form waits for further switches before it saves, thus a
 * citizen who switches several events keeps one request. Same duration as
 * the notification settings.
 */
const SAVE_DEBOUNCE_DURATION = 1000;

/** One seasonal event, as the account page offers it to the citizen */
export interface SeasonalThemeSettingRow {
  readonly eventKey: SeasonalEventKey;
  readonly title: string;
  readonly dateRangeLabel: string;
  /** Whether the citizen sees the theme of the event */
  readonly enabled: boolean;
}

interface Props {
  readonly className?: string;
  readonly rows: readonly SeasonalThemeSettingRow[];
}

export const SeasonalThemeSettingsForm = ({ className, rows }: Props) => {
  const { state, formAction } = useAction(updateMySeasonalThemeSettings, {
    errorToast: false,
  });

  const submit = useMemo(
    () =>
      debounce((form: HTMLFormElement) => {
        const formData = new FormData(form);

        startTransition(() => formAction(formData));
      }, SAVE_DEBOUNCE_DURATION),
    [formAction],
  );

  useEffect(() => {
    return () => {
      submit.cancel();
    };
  }, [submit]);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    submit(event.currentTarget);
  };

  return (
    <form onChange={handleChange} className={clsx("flex flex-col", className)}>
      {rows.map((row) => (
        <SeasonalThemeSettingField key={row.eventKey} row={row} />
      ))}

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};

interface SeasonalThemeSettingFieldProps {
  readonly row: SeasonalThemeSettingRow;
}

const SeasonalThemeSettingField = ({ row }: SeasonalThemeSettingFieldProps) => {
  const inputId = useId();

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1">
        <label htmlFor={inputId} className="cursor-pointer">
          {row.title}
        </label>

        <p className="text-sm text-neutral-500">{row.dateRangeLabel}</p>
      </div>

      <YesNoCheckbox
        /**
         * The key carries the stored state: a render with new data from the
         * server mounts the switch again, thus the stored state wins over
         * the state the browser holds for the element.
         */
        key={`${row.eventKey}:${String(row.enabled)}`}
        id={inputId}
        name={row.eventKey}
        value="true"
        defaultChecked={row.enabled}
        hideLabel
        className="flex-none"
      />
    </div>
  );
};
