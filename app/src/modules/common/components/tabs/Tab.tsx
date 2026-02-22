"use client";

import clsx from "clsx";
import { type ReactNode } from "react";
import { useTabsContext } from "./TabsContext";

interface Props {
  children?: ReactNode;
  id: string;
}

const Tab = ({ children, id }: Readonly<Props>) => {
  const { activeTab, setActiveTab } = useTabsContext();

  return (
    <button
      onClick={() => setActiveTab(id)}
      type="button"
      className={clsx(
        "first:rounded-l border-[1px] border-brand-red-700 last:rounded-r h-8 flex items-center justify-center px-3 gap-2 font-mono uppercase",
        {
          "bg-brand-red-500 text-white": activeTab === id,
          "text-brand-red-500": activeTab !== id,
          "hover:text-brand-red-300 hover:border-brand-red-300":
            activeTab !== id,
        },
      )}
    >
      {children}
    </button>
  );
};

export default Tab;
