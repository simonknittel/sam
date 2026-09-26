"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useState, useTransition, type FormEvent } from "react";
import { setSeasonalDateOverride } from "../actions/setSeasonalDateOverride";
import type { SeasonalDatePreset } from "../queries/getSeasonalDatePresets";
import type { SeasonalOverrideState } from "../queries/getSeasonalOverrideState";

const FIELD_CLASS_NAME =
  "rounded-secondary bg-neutral-900 py-1 px-2 text-sm [color-scheme:dark] hover:bg-neutral-800 focus:outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/25 active:bg-neutral-800 disabled:opacity-50";

interface Props {
  readonly presets: readonly SeasonalDatePreset[];
  readonly override: SeasonalOverrideState | null;
}

export const SeasonalThemeTool = ({ presets, override }: Props) => {
  const [date, setDate] = useState(override?.date ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = (value: string) => {
    const formData = new FormData();
    formData.set("date", value);

    startTransition(() =>
      runActionAndReload(setSeasonalDateOverride, formData),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(date);
  };

  // A preset only fills the date field; "Set date" applies it
  const selectedPreset = presets.find((preset) => preset.date === date);

  return (
    <div className="flex flex-col gap-2">
      {override?.isEventHidden && (
        <p className="text-xs text-amber-500">
          Hidden: the viewer switched this event off.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <select
          aria-label="Preset"
          value={selectedPreset?.date ?? ""}
          onChange={(event) => setDate(event.target.value)}
          disabled={isPending}
          className={clsx(FIELD_CLASS_NAME, "w-full enabled:cursor-pointer")}
        >
          <option value="" disabled>
            Preset …
          </option>

          {presets.map((preset) => (
            <option key={preset.label} value={preset.date}>
              {preset.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          <input
            type="date"
            aria-label="Date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={isPending}
            className={clsx(FIELD_CLASS_NAME, "min-w-0 flex-1")}
          />

          <Button2
            type="submit"
            variant={Button2Variant.Secondary}
            disabled={isPending}
          >
            Set date
          </Button2>

          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => submit("")}
            disabled={isPending || !override}
          >
            Auto
          </Button2>
        </div>
      </form>
    </div>
  );
};
