"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface TabsContextInterface {
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextInterface | undefined>(undefined);

interface Props {
  children: ReactNode;
  initialActiveTab?: string;
  /**
   * Only when a component outside of the tabs changes the active tab, for
   * example a link to a sub-tab. Give it together with `onActiveTabChange`.
   */
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
}

export const TabsProvider = ({
  children,
  initialActiveTab,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}: Readonly<Props>) => {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<
    string | null
  >(initialActiveTab || null);

  const value = {
    activeTab: controlledActiveTab ?? uncontrolledActiveTab,
    setActiveTab: onActiveTabChange ?? setUncontrolledActiveTab,
  };

  return (
    <TabsContext value={value}>
      <Tabs.Root value={value.activeTab} onValueChange={value.setActiveTab}>
        {children}
      </Tabs.Root>
    </TabsContext>
  );
};

export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
