"use client";

import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { useTopLoader } from "nextjs-toploader";
import { useQueryState, useQueryStates } from "nuqs";
import { useCallback, useEffect, useTransition } from "react";
import { RadioGroup } from "../../../form/RadioGroup";

interface Props {
  readonly name: string;
  readonly label: string;
  readonly items: { value: string; label: string; default?: boolean }[];
  readonly className?: string;
  readonly resetCursorPagination?: boolean;
}

export const RadioFilter = ({
  name,
  label,
  items,
  className,
  resetCursorPagination,
}: Props) => {
  const [isLoading, startTransition] = useTransition();

  const [value, setValue] = useQueryState(name, {
    shallow: false,
    startTransition,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  const setValueAndResetPagination = useCallback(
    async (newValue: string) => {
      await setValue(newValue);

      if (resetCursorPagination) {
        await setPagination({
          cursor: null,
          direction: null,
        });
      }
    },
    [setValue, setPagination, resetCursorPagination],
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  let defaultItem = items.find((item) => item.default);
  if (!defaultItem) defaultItem = items[0];

  return (
    <div className={clsx("bg-secondary p-2 corners-secondary", className)}>
      <p className="text-sm text-white/40 font-mono uppercase">{label}</p>

      <RadioGroup
        name={name}
        items={items}
        value={value || defaultItem.value}
        onChange={setValueAndResetPagination}
        className="mt-1"
      />
    </div>
  );
};
