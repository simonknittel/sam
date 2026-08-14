"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

interface TabsContextInterface {
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextInterface | undefined>(undefined);

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
    <TabsContext.Provider value={value}>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        {children}
      </Tabs.Root>
    </TabsContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
