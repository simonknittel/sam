"use client";

import { Tabs } from "@base-ui/react/tabs";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const TabList = ({ children }: Readonly<Props>) => {
  return <Tabs.List className="flex mb-4 flex-wrap">{children}</Tabs.List>;
};

export default TabList;
