"use client";

import clsx from "clsx";
import { type ReactNode } from "react";
import { useTabsContext } from "./TabsContext";

interface Props {
  children?: ReactNode;
  id: string;
}

const TabPanel = ({ children, id }: Readonly<Props>) => {
  const { activeTab } = useTabsContext();

  // if (activeTab !== id) return null; // TODO: This will make forms with tabs (permissions) unusable since some of the inputs won't get initialized.
  // return children;

  return <div className={clsx({ hidden: activeTab !== id })}>{children}</div>;
};

export default TabPanel;
