"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useSharingPopoverOpener } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverProvider";
import { LogFolderState } from "@/modules/remote-control-program/runtime/types";
import { useBrowserRuntime } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import { FaCloudArrowUp } from "react-icons/fa6";
import { getEntryWindow } from "../utils/entryWindow";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

/**
 * Opens the sharing popover with a request for the own entries of the date
 * range which did not go up automatically. The popover counts them, and
 * uploads them only after the confirmation of the owner (decision 27 of
 * `docs/remote-control-program/README.md`).
 */
export const OlderEntriesButton = () => {
  const { dateRange, daysToLoad } = useLogAnalyzerContext();
  const runtime = useBrowserRuntime();
  const opener = useSharingPopoverOpener();

  // Only the log files of this browser have entries to request
  if (!opener || runtime?.state.folder.state !== LogFolderState.Granted)
    return null;

  return (
    <Button2
      type="button"
      variant={Button2Variant.Secondary}
      onClick={() =>
        opener.openWithOlderEntriesRequest(
          getEntryWindow(dateRange, daysToLoad),
        )
      }
    >
      <FaCloudArrowUp />
      Ältere Game Logs hochladen
    </Button2>
  );
};
