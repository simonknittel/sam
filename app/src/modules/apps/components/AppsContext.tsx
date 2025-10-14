"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { App } from "../utils/types";

interface AppsContext {
  readonly apps: App[] | null;
}

const AppsContext = createContext<AppsContext | undefined>(undefined);

interface Props {
  readonly apps: App[] | null;
  readonly children: ReactNode;
}

export const AppsContextProvider = ({ apps, children }: Props) => {
  const value = useMemo(
    () => ({
      apps,
    }),
    [apps],
  );

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useAppsContext() {
  const context = useContext(AppsContext);
  if (!context) throw new Error("[AppsContext] Provider is missing!");
  return context;
}
