"use client";

import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import type { DesktopCompanionSignIn } from "@sam-monorepo/application";
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

const RUNTIME_TABS = Object.values(SharingPopoverRuntimeTab);

const isRuntimeTab = (tab: string): tab is SharingPopoverRuntimeTab =>
  Object.values<string>(SharingPopoverRuntimeTab).includes(tab);

interface Props {
  /** The parent keeps it, thus a link of the start opens a sub-tab */
  readonly runtimeTab: SharingPopoverRuntimeTab;
  readonly onRuntimeTabChange: (runtimeTab: SharingPopoverRuntimeTab) => void;
  readonly tabListRef: RefObject<HTMLDivElement | null>;
  /** See `DesktopCompanionSection` */
  readonly serverState: ReactNode;
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
  tabListRef,
  serverState,
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
        {/* Like the tabs of the popover on a phone */}
        <div
          ref={tabListRef}
          className="max-sm:[&_[role=tab]]:px-1.5 max-sm:[&_[role=tab]]:text-xs"
        >
          <TabList>
            {RUNTIME_TABS.map((tab) => (
              <Tab key={tab} id={tab}>
                {SHARING_POPOVER_RUNTIME_TAB_LABELS[tab]}
              </Tab>
            ))}
          </TabList>
        </div>

        <TabPanel id={SharingPopoverRuntimeTab.Browser}>
          <BrowserSettingsSection />
        </TabPanel>

        <TabPanel id={SharingPopoverRuntimeTab.DesktopCompanion}>
          <DesktopCompanionSection
            serverState={serverState}
            signIns={desktopCompanionSignIns}
          />
        </TabPanel>
      </TabsProvider>
    </SharingPopoverSection>
  );
};
