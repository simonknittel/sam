"use client";

import Note from "@/modules/common/components/Note";
import {
  BrowserRuntimeErrorCode,
  ChannelStatus,
} from "@sam-monorepo/remote-control-program-runtime";
import { useState } from "react";
import type { BrowserRuntimeHandle } from "../../runtime/types";
import { BROWSER_RUNTIME_ERROR_TEXTS } from "./browserRuntimeTexts";
import { OlderEntriesUploadForm } from "./OlderEntriesUploadForm";
import { SharingPopoverCollapsible } from "./SharingPopoverCollapsible";

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/**
 * The upload of the entries of a date range that did not go up automatically
 * (decision 27). Closed at first.
 */
export const OlderEntriesUpload = ({ runtime }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <SharingPopoverCollapsible
      heading="Ältere Game Logs hochladen"
      summary={null}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <UploadContent runtime={runtime} />
    </SharingPopoverCollapsible>
  );
};

const UploadContent = ({ runtime }: Props) => {
  const { state } = runtime;

  if (!state.isRunning)
    return (
      <Note
        type="info"
        message={
          BROWSER_RUNTIME_ERROR_TEXTS[BrowserRuntimeErrorCode.NotRunning]
        }
      />
    );

  // The runtime refuses the request after the end of the channel: no relay, or a refused token
  if (state.channel.status === ChannelStatus.Ended)
    return (
      <Note
        type="error"
        message={
          BROWSER_RUNTIME_ERROR_TEXTS[BrowserRuntimeErrorCode.RelayNotAvailable]
        }
      />
    );

  return <OlderEntriesUploadForm runtime={runtime} />;
};
