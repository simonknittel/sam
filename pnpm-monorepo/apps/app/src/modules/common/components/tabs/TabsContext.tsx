"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

interface TabsContextInterface {
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
}

const AccountContext = createContext<TabsContextInterface | undefined>(
  undefined,
);

interface Props {
  children: ReactNode;
  initialActiveTab?: string;
}

export const TabsProvider = ({
  children,
  initialActiveTab,
}: Readonly<Props>) => {
  const [activeTab, setActiveTab] = useState<string | null>(
    initialActiveTab || null,
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
    }),
    [activeTab, setActiveTab],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useTabsContext() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
