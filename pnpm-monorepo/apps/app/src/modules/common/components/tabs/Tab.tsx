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
          "flex h-8 items-center justify-center gap-2 border border-brand-red-700 px-3 font-mono uppercase first:rounded-l last:rounded-r enabled:cursor-pointer",
          {
            "bg-brand-red-500 text-white": state.active,
            "text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300":
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
