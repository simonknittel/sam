"use client";

import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

interface QuickLook {
  /**
   * In the order of their selection. Each type is kept under its oldest
   * version (see `shareValueAcrossVersions`), thus the quick look of a type
   * includes all its versions. Empty without a quick look.
   */
  readonly quickLookTypes: LogAnalyzerEntryType[];
  readonly setQuickLookTypes: Dispatch<SetStateAction<LogAnalyzerEntryType[]>>;
}

/**
 * Not stored: a reload shows the types of the settings again.
 *
 * A context of its own, because each row of the table reads it: a change of the
 * other settings must not render the memoized rows again.
 */
export const QuickLookContext = createContext<QuickLook | undefined>(undefined);

export const useQuickLook = () => {
  const quickLook = useContext(QuickLookContext);
  if (!quickLook)
    throw new Error(
      "Provider for `useQuickLook()` is missing! Make sure to only use it as child of `<LogAnalyzerContext>...</LogAnalyzerContext>`.",
    );
  return quickLook;
};
