"use client";

import Note from "@/modules/common/components/Note";
import { ConnectorId } from "@sam-monorepo/domain";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { BROWSER_NOT_SUPPORTED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserRuntimeControl } from "./BrowserRuntimeControl";
import { LogFileConnectorControl } from "./LogFileConnectorControl";
import {
  SharingPopoverSection,
  SharingPopoverSubsection,
} from "./SharingPopoverSection";
import {
  SHARING_POPOVER_RUNTIME_TAB_LABELS,
  SharingPopoverRuntimeTab,
  type ExpandedConnectors,
} from "./SharingPopoverTab";

interface Props {
  readonly expandedConnectors: ExpandedConnectors;
  readonly onConnectorExpandedChange: (
    connector: ConnectorId,
    isExpanded: boolean,
  ) => void;
}

/**
 * The browser runtime of this browser and one part for each of its
 * connectors. The section does not depend on the data of the server: the
 * popover shows it also while that data loads or when the read failed.
 */
export const BrowserSettingsSection = ({
  expandedConnectors,
  onConnectorExpandedChange,
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
            <LogFileConnectorControl
              runtime={runtime}
              isExpanded={expandedConnectors[ConnectorId.LogFile] ?? false}
              onExpandedChange={(isExpanded) =>
                onConnectorExpandedChange(ConnectorId.LogFile, isExpanded)
              }
            />
          </SharingPopoverSubsection>
        </>
      )}
    </SharingPopoverSection>
  );
};
