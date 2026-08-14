"use client";

import { Tabs } from "@base-ui/react/tabs";
import clsx from "clsx";
import { type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  id: string;
}

const Tab = ({ children, id }: Readonly<Props>) => {
  return (
    <Tabs.Tab
      value={id}
      className={(state) =>
        clsx(
          "first:rounded-l border border-brand-red-700 last:rounded-r h-8 flex items-center justify-center px-3 gap-2 font-mono uppercase enabled:cursor-pointer",
          {
            "bg-brand-red-500 text-white": state.active,
            "text-brand-red-500 hover:text-brand-red-300 hover:border-brand-red-300":
              !state.active,
          },
        )
      }
    >
      {children}
    </Tabs.Tab>
  );
};

export default Tab;
