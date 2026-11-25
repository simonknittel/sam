"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { getDateRangePresets } from "../utils/dateRangePresets";
import type { DateRange } from "../utils/entryWindow";

interface Props {
  readonly value: DateRange;
  readonly onChange: (value: DateRange) => void;
  readonly onPreset: (value: DateRange) => void;
  /** `YYYY-MM-DD` */
  readonly today: string;
  /** See `LogSelection` */
  readonly oldestSessionStart: number | null;
}

/**
 * The inputs of a date range and its presets. An input reports a valid date
 * after each digit of the year, for example the year 0002, thus the form
 * applies the inputs with a button. A preset has no such step.
 */
export const DateRangeFields = ({
  value,
  onChange,
  onPreset,
  today,
  oldestSessionStart,
}: Props) => {
  /**
   * Only for the preset of all log files: the entries of the relay can be
   * older than the log files of this browser, thus the inputs have no lower
   * limit
   */
  const oldestLogDay = oldestSessionStart
    ? getLocalDateKey(new Date(oldestSessionStart), ORGANIZATION_TIMEZONE)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {getDateRangePresets(today, oldestLogDay).map((preset) => (
          <Button2
            key={preset.label}
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => onPreset({ from: preset.from, to: preset.to })}
          >
            {preset.label}
          </Button2>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-44 flex-1">
          <DateInput
            label="Von"
            labelClassName="text-sm text-white/60"
            className="mt-1"
            value={value.from ?? ""}
            max={value.to ?? today}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value || null })
            }
          />
        </div>

        <div className="min-w-44 flex-1">
          <DateInput
            label="Bis"
            labelClassName="text-sm text-white/60"
            className="mt-1"
            value={value.to ?? ""}
            min={value.from ?? undefined}
            max={today}
            onChange={(event) =>
              onChange({ ...value, to: event.target.value || null })
            }
          />
        </div>
      </div>
    </div>
  );
};
