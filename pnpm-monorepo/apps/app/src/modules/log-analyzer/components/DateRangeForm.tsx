"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";
import { hasDateRange, NO_DATE_RANGE } from "../utils/entryWindow";
import type { LogSelection } from "../utils/selectLogFiles";
import type { ReadProgress } from "../utils/types";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const BYTES_PER_MEGABYTE = 1_000_000;

const megabyteFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatMegabytes = (byteCount: number) =>
  megabyteFormat.format(byteCount / BYTES_PER_MEGABYTE);

interface Props {
  readonly logSelection: LogSelection | null;
  readonly readProgress: ReadProgress | null;
  readonly isLoadingSharedEntries: boolean;
  readonly className?: string;
}

/**
 * The range applies with a button: a date input reports a valid date after
 * each digit of the year, for example the year 0002, and an immediate read
 * would then read all logs.
 */
export const DateRangeForm = ({
  logSelection,
  readProgress,
  isLoadingSharedEntries,
  className,
}: Props) => {
  const { today, dateRange, setDateRange, isLivePaused, isSharedViewEnabled } =
    useLogAnalyzerContext();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const selectedRange = { from: from || null, to: to || null };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDateRange(selectedRange);
  };

  const handleReset = () => {
    setFrom("");
    setTo("");
    setDateRange(NO_DATE_RANGE);
  };

  /** The shared entries can be older than the local log files */
  const oldestDate =
    !isSharedViewEnabled && logSelection?.oldestSessionStart
      ? getLocalDateKey(
          new Date(logSelection.oldestSessionStart),
          ORGANIZATION_TIMEZONE,
        )
      : undefined;

  const isUnchanged =
    selectedRange.from === dateRange.from && selectedRange.to === dateRange.to;

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx("flex flex-wrap items-end gap-4", className)}
    >
      <div className="w-44">
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

      <div className="w-44">
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

      <Button2
        type="submit"
        variant={Button2Variant.Secondary}
        disabled={isUnchanged}
      >
        Anwenden
      </Button2>

      {(hasDateRange(dateRange) || from || to) && (
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={handleReset}
        >
          Zurücksetzen
        </Button2>
      )}

      <div className="self-center text-sm text-white/60">
        {/* A live read holds one file and ends at once */}
        {readProgress && readProgress.fileCount > 1 ? (
          <p>
            Lese {readProgress.readFileCount} von {readProgress.fileCount}{" "}
            Dateien ({formatMegabytes(readProgress.readByteCount)} von{" "}
            {formatMegabytes(readProgress.byteCount)} MB)
          </p>
        ) : (
          logSelection && (
            <p>
              {logSelection.selectedFileCount} von {logSelection.fileCount}{" "}
              Sessions, {formatMegabytes(logSelection.selectedByteCount)} MB
            </p>
          )
        )}

        {isLoadingSharedEntries && <p>Lade geteilte Einträge …</p>}

        {isLivePaused && (
          <p>
            Automatisch aktualisieren ist pausiert, weil der Zeitraum in der
            Vergangenheit endet.
          </p>
        )}
      </div>
    </form>
  );
};
