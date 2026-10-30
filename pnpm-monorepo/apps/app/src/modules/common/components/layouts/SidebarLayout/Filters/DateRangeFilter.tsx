"use client";

import { DateInput } from "@/modules/common/components/form/DateInput";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useTransition } from "react";

interface Props {
  readonly fromName: string;
  readonly toName: string;
  readonly label: string;
  readonly className?: string;
  readonly resetCursorPagination?: boolean;
  /**
   * The bounds ("YYYY-MM-DD") that the reader of the filter applies while
   * the URL has none. The inputs show them, thus the filter shows the range
   * that the page shows.
   */
  readonly defaultFrom?: string;
  readonly defaultTo?: string;
}

/**
 * Two `<input type="date">` bounds, both optional, kept in the URL as plain
 * `YYYY-MM-DD` strings. Which instants those days start and end at is a
 * question for whoever reads them — the browser has no business deciding it
 * from its own time zone.
 */
export const DateRangeFilter = ({
  fromName,
  toName,
  label,
  className,
  resetCursorPagination,
  defaultFrom,
  defaultTo,
}: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [range, setRange] = useQueryStates(
    {
      [fromName]: parseAsString,
      [toName]: parseAsString,
    },
    { shallow: false, startTransition },
  );
  const from = range[fromName] ?? defaultFrom ?? null;
  const to = range[toName] ?? defaultTo ?? null;
  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  /**
   * Both bounds go into the URL, thus a bound that only showed its default
   * keeps the value that the user saw
   */
  const setBound = async (name: string, value: string) => {
    await setRange({
      [fromName]: from,
      [toName]: to,
      [name]: value === "" ? null : value,
    });

    if (resetCursorPagination)
      await setPagination({ cursor: null, direction: null });
  };

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) loader.start();
  }, [loader, isLoading]);

  return (
    <div className={clsx("corners-secondary bg-secondary p-2", className)}>
      <p className="font-mono text-sm text-white/40 uppercase">{label}</p>

      <div className="mt-1 flex flex-col gap-2">
        <DateInput
          label="Von"
          labelClassName="text-sm text-white/60"
          value={from ?? ""}
          max={to ?? undefined}
          onChange={(event) => void setBound(fromName, event.target.value)}
          className="mt-1"
        />

        <DateInput
          label="Bis"
          labelClassName="text-sm text-white/60"
          value={to ?? ""}
          min={from ?? undefined}
          onChange={(event) => void setBound(toName, event.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );
};
