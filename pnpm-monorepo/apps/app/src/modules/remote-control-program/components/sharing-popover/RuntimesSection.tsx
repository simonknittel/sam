"use client";

import Tab from "@/modules/common/components/tabs/Tab";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import type {
  DesktopCompanionSignIn,
  OwnRuntime,
} from "@sam-monorepo/application";
import type { ConnectorId } from "@sam-monorepo/domain";
import type { ReactNode, RefObject } from "react";
import { BrowserSettingsSection } from "./BrowserSettingsSection";
import { DesktopCompanionSection } from "./DesktopCompanionSection";
import { SharingPopoverSection } from "./SharingPopoverSection";
import {
  SHARING_POPOVER_RUNTIME_TAB_LABELS,
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverRuntimeTab,
  SharingPopoverTab,
} from "./SharingPopoverTab";
import { SharingPopoverTabList } from "./SharingPopoverTabList";

const RUNTIME_TABS = Object.values(SharingPopoverRuntimeTab);

const isRuntimeTab = (tab: string): tab is SharingPopoverRuntimeTab =>
  Object.values<string>(SharingPopoverRuntimeTab).includes(tab);

interface Props {
  /** The parent keeps it, thus a link of the start opens a sub-tab */
  readonly runtimeTab: SharingPopoverRuntimeTab;
  readonly onRuntimeTabChange: (runtimeTab: SharingPopoverRuntimeTab) => void;
  /** The sub-tab of a connector in the sub-tab of the browser. The parent keeps it, thus a link of the start selects it. */
  readonly connectorTab: ConnectorId;
  readonly onConnectorTabChange: (connectorTab: ConnectorId) => void;
  readonly tabListRef: RefObject<HTMLDivElement | null>;
  /** See `DesktopCompanionSection` */
  readonly serverState: ReactNode;
  readonly desktopCompanions: readonly OwnRuntime[] | undefined;
  readonly desktopCompanionSignIns:
    readonly DesktopCompanionSignIn[] | undefined;
}

/**
 * The settings of the runtimes, with one sub-tab for each runtime. The
 * sub-tab of the browser does not wait for the data of the server.
 */
export const RuntimesSection = ({
  runtimeTab,
  onRuntimeTabChange,
  connectorTab,
  onConnectorTabChange,
  tabListRef,
  serverState,
  desktopCompanions,
  desktopCompanionSignIns,
}: Props) => {
  return (
    <SharingPopoverSection
      heading={SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Runtimes]}
    >
      <TabsProvider
        activeTab={runtimeTab}
        onActiveTabChange={(tab) => {
          if (isRuntimeTab(tab)) onRuntimeTabChange(tab);
        }}
      >
        <SharingPopoverTabList ref={tabListRef}>
          {RUNTIME_TABS.map((tab) => (
            <Tab key={tab} id={tab}>
              {SHARING_POPOVER_RUNTIME_TAB_LABELS[tab]}
            </Tab>
          ))}
        </SharingPopoverTabList>

        <TabPanel id={SharingPopoverRuntimeTab.Browser}>
          <BrowserSettingsSection
            connectorTab={connectorTab}
            onConnectorTabChange={onConnectorTabChange}
          />
        </TabPanel>

        <TabPanel id={SharingPopoverRuntimeTab.DesktopCompanion}>
          <DesktopCompanionSection
            serverState={serverState}
            runtimes={desktopCompanions}
            signIns={desktopCompanionSignIns}
          />
        </TabPanel>
      </TabsProvider>
    </SharingPopoverSection>
  );
};
