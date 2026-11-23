"use client";

import Note from "@/modules/common/components/Note";
import { useRef } from "react";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { BROWSER_NOT_SUPPORTED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserRuntimeControl } from "./BrowserRuntimeControl";
import { LocalAccessControl } from "./LocalAccessControl";
import { OlderEntriesRequestPanel } from "./OlderEntriesRequestPanel";
import { useOlderEntriesRequest } from "./SharingPopoverProvider";
import { SharingPopoverSection } from "./SharingPopoverSection";

/**
 * The section "Settings of this browser" (see "Sharing popover" of
 * `docs/remote-control-program/README.md`): the browser runtime of this
 * browser, its local access layer, and the request for older entries of a
 * control UI.
 *
 * The section does not depend on the data of the server: the popover shows
 * it also while that data loads or when the read failed.
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
    <SharingPopoverSection heading="Dieser Browser" headingRef={headingRef}>
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

          <LocalAccessControl runtime={runtime} />
        </>
      )}
    </SharingPopoverSection>
  );
};
