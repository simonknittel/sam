"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useTransition, type FormEvent } from "react";
import { setSeasonalDateOverride } from "../actions/setSeasonalDateOverride";
import type { SeasonalOverrideState } from "../queries/getSeasonalOverrideState";
import type { SeasonalDatePreset } from "../utils/getSeasonalDatePresets";

interface Props {
  readonly presets: readonly SeasonalDatePreset[];
  readonly override: SeasonalOverrideState | null;
}

export const SeasonalThemeTool = ({ presets, override }: Props) => {
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(() =>
      runActionAndReload(setSeasonalDateOverride, formData),
    );
  };

  const setDate = (date: string) => {
    const formData = new FormData();
    formData.set("date", date);
    submit(formData);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {override
          ? `${override.eventTitle ?? "No theme"} on ${override.date}`
          : "Auto (today)"}
      </p>

      {override?.isEventHidden && (
        <p className="text-xs text-amber-500">
          Hidden: the viewer switched this event off.
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <SeasonalPresetButton
            key={preset.label}
            preset={preset}
            isActive={preset.date === override?.date}
            disabled={isPending}
            onSelect={setDate}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1">
        <input
          type="date"
          name="date"
          required
          aria-label="Date"
          defaultValue={override?.date}
          disabled={isPending}
          className="min-w-0 flex-1 rounded-secondary bg-neutral-900 py-1 px-2 text-sm [color-scheme:dark] hover:bg-neutral-800 focus:outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/25 active:bg-neutral-800 disabled:opacity-50"
        />

        <Button2
          type="submit"
          variant={Button2Variant.Secondary}
          disabled={isPending}
        >
          Set date
        </Button2>
      </form>

      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setDate("")}
        disabled={isPending || !override}
      >
        Auto (today)
      </Button2>
    </div>
  );
};

interface SeasonalPresetButtonProps {
  readonly preset: SeasonalDatePreset;
  readonly isActive: boolean;
  readonly disabled: boolean;
  readonly onSelect: (date: string) => void;
}

const SeasonalPresetButton = ({
  preset,
  isActive,
  disabled,
  onSelect,
}: SeasonalPresetButtonProps) => {
  return (
    <Button2
      type="button"
      variant={isActive ? Button2Variant.Primary : Button2Variant.Secondary}
      aria-pressed={isActive}
      title={preset.date}
      onClick={() => onSelect(preset.date)}
      disabled={disabled}
    >
      {preset.label}
    </Button2>
  );
};
