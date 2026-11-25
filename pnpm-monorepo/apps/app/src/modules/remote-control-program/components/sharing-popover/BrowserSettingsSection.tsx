"use client";

import Note from "@/modules/common/components/Note";
import { useRef } from "react";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { BROWSER_NOT_SUPPORTED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserRuntimeControl } from "./BrowserRuntimeControl";
import { LogFileConnectorControl } from "./LogFileConnectorControl";
import { OlderEntriesRequestPanel } from "./OlderEntriesRequestPanel";
import { useOlderEntriesRequest } from "./SharingPopoverProvider";
import { SharingPopoverSection } from "./SharingPopoverSection";
import {
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverTab,
} from "./SharingPopoverTab";

/**
 * The browser runtime of this browser, one part for each of its connectors,
 * and the request for older entries of a control UI. The section does not
 * depend on the data of the server: the popover shows it also while that data
 * loads or when the read failed.
 */
export const BrowserSettingsSection = () => {
  const runtime = useBrowserRuntime();
  const olderEntriesRequest = useOlderEntriesRequest();
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (!runtime) return null;

  /** The focus was in the request, which disappears */
  const endOlderEntriesRequest = () => {
    olderEntriesRequest.end();
    headingRef.current?.focus();
  };

  return (
    <SharingPopoverSection
      heading={SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Browser]}
      headingRef={headingRef}
    >
      {runtime.state.folder.state === LogFolderState.NotSupported ? (
        <Note type="info" message={BROWSER_NOT_SUPPORTED_TEXT} />
      ) : (
        <>
          {olderEntriesRequest.request && (
            <OlderEntriesRequestPanel
              key={olderEntriesRequest.request.key}
              request={olderEntriesRequest.request}
              runtime={runtime}
              onEnd={endOlderEntriesRequest}
            />
          )}

          <BrowserRuntimeControl runtime={runtime} />

          <LogFileConnectorControl runtime={runtime} />
        </>
      )}
    </SharingPopoverSection>
  );
};
