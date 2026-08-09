"use client";

import { DateInput } from "@/modules/common/components/form/DateInput";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useTransition } from "react";

interface Props {
  readonly fromName: string;
  readonly toName: string;
  readonly label: string;
  readonly className?: string;
  readonly resetCursorPagination?: boolean;
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
}: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [{ [fromName]: from, [toName]: to }, setRange] = useQueryStates(
    {
      [fromName]: parseAsString,
      [toName]: parseAsString,
    },
    { shallow: false, startTransition },
  );
  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  const setBound = useCallback(
    async (name: string, value: string) => {
      await setRange({ [name]: value === "" ? null : value });

      if (resetCursorPagination)
        await setPagination({ cursor: null, direction: null });
    },
    [setRange, setPagination, resetCursorPagination],
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) loader.start();
  }, [loader, isLoading]);

  return (
    <div className={clsx("bg-secondary p-2 corners-secondary", className)}>
      <p className="text-sm text-white/40 font-mono uppercase">{label}</p>

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
