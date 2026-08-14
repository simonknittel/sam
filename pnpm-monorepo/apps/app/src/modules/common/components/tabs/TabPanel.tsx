"use client";

import { Tabs } from "@base-ui/react/tabs";
import { type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  id: string;
}

/**
 * Panels stay mounted while hidden (`keepMounted`): forms spanning multiple
 * panels (e.g. the role permissions form) rely on the inputs of inactive
 * panels keeping their state and being included in the submission.
 */
const TabPanel = ({ children, id }: Readonly<Props>) => {
  return (
    <Tabs.Panel value={id} keepMounted>
      {children}
    </Tabs.Panel>
  );
};

export default TabPanel;
