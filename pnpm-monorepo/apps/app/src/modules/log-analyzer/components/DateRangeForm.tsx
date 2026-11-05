"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { useState, type SubmitEvent } from "react";
import { getDateRangePresets } from "../utils/dateRangePresets";
import {
  hasDateRange,
  NO_DATE_RANGE,
  type DateRange,
} from "../utils/entryWindow";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  /** In milliseconds. Null when no file name has a date. */
  readonly oldestSessionStart: number | null;
  readonly onClose: () => void;
}

/**
 * The inputs apply with a button: a date input reports a valid date after
 * each digit of the year, for example the year 0002, and an immediate read
 * would then read all logs. A preset has no such step, thus it applies at once.
 */
export const DateRangeForm = ({ oldestSessionStart, onClose }: Props) => {
  const { today, daysToLoad, dateRange, setDateRange, isSharedViewEnabled } =
    useLogAnalyzerContext();

  const [from, setFrom] = useState(dateRange.from ?? "");
  const [to, setTo] = useState(dateRange.to ?? "");

  const selectedRange = { from: from || null, to: to || null };

  const applyDateRange = (range: DateRange) => {
    setDateRange(range);
    onClose();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyDateRange(selectedRange);
  };

  const oldestLogDay = oldestSessionStart
    ? getLocalDateKey(new Date(oldestSessionStart), ORGANIZATION_TIMEZONE)
    : null;

  /** The shared entries can be older than the local log files */
  const oldestDate = isSharedViewEnabled
    ? undefined
    : (oldestLogDay ?? undefined);

  const isUnchanged =
    selectedRange.from === dateRange.from && selectedRange.to === dateRange.to;

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-sm text-white/60">
        Ohne Zeitraum zeigt der Log Analyzer die letzten {daysToLoad} Tage.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {getDateRangePresets(today, oldestLogDay).map((preset) => (
          <Button2
            key={preset.label}
            type="button"
            variant={Button2Variant.Secondary}
            disabled={oldestDate !== undefined && preset.to < oldestDate}
            onClick={() =>
              applyDateRange({
                from:
                  oldestDate && preset.from < oldestDate
                    ? oldestDate
                    : preset.from,
                to: preset.to,
              })
            }
          >
            {preset.label}
          </Button2>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="min-w-44 flex-1">
          <DateInput
            label="Von"
            labelClassName="text-sm text-white/60"
            className="mt-1"
            value={from}
            min={oldestDate}
            max={to || today}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>

        <div className="min-w-44 flex-1">
          <DateInput
            label="Bis"
            labelClassName="text-sm text-white/60"
            className="mt-1"
            value={to}
            min={from || oldestDate}
            max={today}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {hasDateRange(dateRange) && (
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => applyDateRange(NO_DATE_RANGE)}
          >
            Zurücksetzen
          </Button2>
        )}

        <Button2 type="submit" disabled={isUnchanged}>
          Anwenden
        </Button2>
      </div>
    </form>
  );
};
