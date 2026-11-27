"use client";

import Note from "@/modules/common/components/Note";
import Tab from "@/modules/common/components/tabs/Tab";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import { ConnectorId } from "@sam-monorepo/domain";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { BROWSER_NOT_SUPPORTED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserRuntimeControl } from "./BrowserRuntimeControl";
import { CONNECTOR_LABELS } from "./catalogTexts";
import { LogFileConnectorControl } from "./LogFileConnectorControl";
import {
  SharingPopoverSection,
  SharingPopoverSubsection,
} from "./SharingPopoverSection";
import {
  BROWSER_RUNTIME_CONNECTORS,
  SHARING_POPOVER_RUNTIME_TAB_LABELS,
  SharingPopoverRuntimeTab,
} from "./SharingPopoverTab";
import { SharingPopoverTabList } from "./SharingPopoverTabList";

const isConnectorId = (tab: string): tab is ConnectorId =>
  Object.values<string>(ConnectorId).includes(tab);

interface Props {
  /** See `RuntimesSection` */
  readonly connectorTab: ConnectorId;
  readonly onConnectorTabChange: (connectorTab: ConnectorId) => void;
}

/**
 * The browser runtime of this browser and one sub-tab for each of its
 * connectors. The section does not depend on the data of the server: the
 * popover shows it also while that data loads or when the read failed.
 */
export const BrowserSettingsSection = ({
  connectorTab,
  onConnectorTabChange,
}: Props) => {
  const runtime = useBrowserRuntime();

  if (!runtime) return null;

  return (
    <SharingPopoverSection
      heading={
        SHARING_POPOVER_RUNTIME_TAB_LABELS[SharingPopoverRuntimeTab.Browser]
      }
    >
      {runtime.state.folder.state === LogFolderState.NotSupported ? (
        <Note type="info" message={BROWSER_NOT_SUPPORTED_TEXT} />
      ) : (
        <>
          <BrowserRuntimeControl runtime={runtime} />

          <SharingPopoverSubsection heading="Connectors">
            <TabsProvider
              activeTab={connectorTab}
              onActiveTabChange={(tab) => {
                if (isConnectorId(tab)) onConnectorTabChange(tab);
              }}
            >
              <SharingPopoverTabList>
                {BROWSER_RUNTIME_CONNECTORS.map((connector) => (
                  <Tab key={connector} id={connector}>
                    {CONNECTOR_LABELS[connector]}
                  </Tab>
                ))}
              </SharingPopoverTabList>

              <TabPanel id={ConnectorId.LogFile}>
                <LogFileConnectorControl runtime={runtime} />
              </TabPanel>
            </TabsProvider>
          </SharingPopoverSubsection>
        </>
      )}
    </SharingPopoverSection>
  );
};
