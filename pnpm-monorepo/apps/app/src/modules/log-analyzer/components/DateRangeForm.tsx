"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useState, type SubmitEvent } from "react";
import {
  hasDateRange,
  NO_DATE_RANGE,
  type DateRange,
} from "../utils/entryWindow";
import { DateRangeFields } from "./DateRangeFields";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  /** See `LogSelection` */
  readonly oldestSessionStart: number | null;
  readonly onClose: () => void;
}

export const DateRangeForm = ({ oldestSessionStart, onClose }: Props) => {
  const { today, daysToLoad, dateRange, setDateRange } =
    useLogAnalyzerContext();

  const [selectedRange, setSelectedRange] = useState(dateRange);

  const applyDateRange = (range: DateRange) => {
    setDateRange(range);
    onClose();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyDateRange(selectedRange);
  };

  const isUnchanged =
    selectedRange.from === dateRange.from && selectedRange.to === dateRange.to;

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-4 text-sm text-white/60">
        Ohne Zeitraum zeigt der Log Analyzer die letzten {daysToLoad} Tage.
      </p>

      <DateRangeFields
        value={selectedRange}
        onChange={setSelectedRange}
        onPreset={applyDateRange}
        today={today}
        oldestSessionStart={oldestSessionStart}
      />

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
