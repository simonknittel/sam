"use client";

import { useLocalStorage } from "@uidotdev/usehooks";
import { useMemo } from "react";

/**
 * A value in the local storage, like `useLocalStorage`. `useLocalStorage`
 * parses the stored text on every render and gives a new object each time.
 * This value stays the same object until the stored text changes, thus the
 * values and functions which read it (for example a context value) change
 * only then.
 */
export const useStoredValue = <Value>(key: string, defaultValue: Value) => {
  const [storedValue, setStoredValue] = useLocalStorage<Value>(
    key,
    defaultValue,
  );

  const storedText = JSON.stringify(storedValue);
  const value = useMemo(() => JSON.parse(storedText) as Value, [storedText]);

  return [value, setStoredValue] as const;
};
