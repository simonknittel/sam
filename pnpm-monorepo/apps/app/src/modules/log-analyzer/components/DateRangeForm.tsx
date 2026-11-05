"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateInput } from "@/modules/common/components/form/DateInput";
import {
  instantToWallTime,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { useNow } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { hasDateRange, NO_DATE_RANGE } from "../utils/entryWindow";
import type { LogSelection } from "../utils/selectLogFiles";
import type { ReadProgress } from "../utils/types";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const BYTES_PER_MEGABYTE = 1_000_000;

/** A page which stays open over midnight must offer the new day */
const TODAY_UPDATE_INTERVAL_MS = 60_000;

const megabyteFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatMegabytes = (byteCount: number) =>
  megabyteFormat.format(byteCount / BYTES_PER_MEGABYTE);

const toDateInputValue = (instant: Date | number) =>
  instantToWallTime(new Date(instant), ORGANIZATION_TIMEZONE).slice(0, 10);

interface Props {
  readonly logSelection: LogSelection | null;
  readonly readProgress: ReadProgress | null;
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
  className,
}: Props) => {
  const { dateRange, setDateRange, isLivePaused, isSharedViewEnabled } =
    useLogAnalyzerContext();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDateRange({ from: from || null, to: to || null });
  };

  const handleReset = () => {
    setFrom("");
    setTo("");
    setDateRange(NO_DATE_RANGE);
  };

  const today = toDateInputValue(
    useNow({ updateInterval: TODAY_UPDATE_INTERVAL_MS }),
  );

  /** The shared entries can be older than the local log files */
  const oldestDate =
    !isSharedViewEnabled && logSelection?.oldestSessionStart
      ? toDateInputValue(logSelection.oldestSessionStart)
      : undefined;

  const isUnchanged =
    (from || null) === dateRange.from && (to || null) === dateRange.to;

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
