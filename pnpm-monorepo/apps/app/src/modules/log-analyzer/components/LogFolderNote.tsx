"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { useSharingPopoverOpener } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverProvider";
import {
  BROWSER_RUNTIME_LOCATION,
  LOG_FOLDER_LOCATION,
  type SharingPopoverLocation,
} from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverTab";
import { useIsUploadedByDesktopCompanion } from "@/modules/remote-control-program/consumer/useIsUploadedByDesktopCompanion";
import {
  LogFolderState,
  type BrowserRuntimeSnapshot,
} from "@/modules/remote-control-program/runtime/types";
import { useBrowserRuntime } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import {
  BROWSER_NOT_SUPPORTED_TEXT,
  NO_CHANNEL_FOLDER_TEXT,
} from "@/modules/remote-control-program/utils/remoteControlProgramTexts";
import { CapabilityId } from "@sam-monorepo/domain";
import { BrowserRuntimeErrorCode } from "@sam-monorepo/remote-control-program-runtime";
import type { ComponentProps } from "react";
import { FaTowerBroadcast } from "react-icons/fa6";

interface FolderNote {
  readonly type: NonNullable<ComponentProps<typeof Note>["type"]>;
  readonly text: string;
  /** Where the owner changes the state in the sharing popover. Null: the owner cannot change it. */
  readonly location: SharingPopoverLocation | null;
}

/**
 * The own entries come through the relay, thus the browser needs no folder.
 * The note does not ask for the folder of the browser.
 */
const DESKTOP_COMPANION_NOTE: FolderNote = {
  type: "info",
  text: "Dein Desktop Companion lädt deine eigenen Einträge hoch. Dieser Browser braucht deshalb keinen Log-Ordner.",
  location: null,
};

/** Null when the browser runtime reads the folder, or did not tell its state yet */
const getFolderNote = ({
  folder,
  isRunning,
  error,
}: BrowserRuntimeSnapshot): FolderNote | null => {
  switch (folder.state) {
    case LogFolderState.Checking:
      return null;

    case LogFolderState.NotSupported:
      return {
        type: "warning",
        text: `${BROWSER_NOT_SUPPORTED_TEXT} Du siehst hier nur die Einträge anderer und deine Einträge von anderen Rechnern.`,
        location: null,
      };

    case LogFolderState.NotSelected:
      return {
        type: "info",
        text: "Wähle im Remote Control Program den Ordner „StarCitizen“ oder einen Kanal wie „LIVE“ aus, damit der Log Analyzer auch deine eigenen Einträge anzeigt.",
        location: LOG_FOLDER_LOCATION,
      };

    case LogFolderState.PermissionNeeded:
      return {
        type: "warning",
        text: `Der Browser braucht erneut deine Erlaubnis, um ${folder.name ? `den Ordner „${folder.name}“` : "deinen Log-Ordner"} zu lesen. Du kannst sie im Remote Control Program erteilen.`,
        location: LOG_FOLDER_LOCATION,
      };

    case LogFolderState.Granted:
      if (!isRunning)
        return {
          type: "info",
          text: "Die Runtime ist gestoppt, deshalb werden deine Logs gerade nicht gelesen. Du kannst sie im Remote Control Program starten.",
          // The start button is above the sub-tabs of the connectors
          location: BROWSER_RUNTIME_LOCATION,
        };

      return error === BrowserRuntimeErrorCode.NoChannelFolder
        ? {
            type: "warning",
            text: NO_CHANNEL_FOLDER_TEXT,
            location: LOG_FOLDER_LOCATION,
          }
        : null;

    default:
      throw new Error(`Unknown folder state: ${folder.state satisfies never}`);
  }
};

/**
 * Tells why the own entries are missing. The Log Analyzer has no own UI for
 * the folder: it opens the sharing popover (see "Sharing popover" of
 * `docs/remote-control-program/README.md`). While a desktop companion of the
 * user uploads `log_entries`, the note asks for no folder.
 */
export const LogFolderNote = () => {
  const runtime = useBrowserRuntime();
  const opener = useSharingPopoverOpener();
  const folderNote = runtime ? getFolderNote(runtime.state) : null;
  const isUploadedByDesktopCompanion = useIsUploadedByDesktopCompanion(
    CapabilityId.LogEntries,
    folderNote !== null,
  );

  if (!folderNote) return null;

  const note = isUploadedByDesktopCompanion
    ? DESKTOP_COMPANION_NOTE
    : folderNote;
  const { location } = note;

  return (
    <Note
      type={note.type}
      message={
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <p>{note.text}</p>

          {location && opener && (
            <Button2
              type="button"
              variant={Button2Variant.Secondary}
              onClick={() => opener.open(location)}
            >
              <FaTowerBroadcast />
              Öffnen
            </Button2>
          )}
        </div>
      }
    />
  );
};
