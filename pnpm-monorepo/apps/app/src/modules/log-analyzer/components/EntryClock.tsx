"use client";

import { useNow } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";

/** A new entry shows its age in seconds */
const TICK_INTERVAL_MS = 10_000;

const Context = createContext<Date | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
}

/**
 * One clock for all rows of the table, instead of one interval for each row.
 * A tick renders only the components which read the clock again, because the
 * rows are memoized.
 */
export const EntryClock = ({ children }: Props) => {
  const now = useNow({ updateInterval: TICK_INTERVAL_MS });

  return <Context.Provider value={now}>{children}</Context.Provider>;
};

export const useEntryClock = () => {
  const now = useContext(Context);
  if (!now)
    throw new Error(
      "Provider for `useEntryClock()` is missing! Make sure to only use it as child of `<EntryClock>...</EntryClock>`.",
    );
  return now;
};
