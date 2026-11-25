"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { useSharingPopoverOpener } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverProvider";
import { SharingPopoverTab } from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverTab";
import {
  LogFolderState,
  type BrowserRuntimeSnapshot,
} from "@/modules/remote-control-program/runtime/types";
import { useBrowserRuntime } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import { BROWSER_NOT_SUPPORTED_TEXT } from "@/modules/remote-control-program/utils/remoteControlProgramTexts";
import type { ComponentProps } from "react";
import { FaTowerBroadcast } from "react-icons/fa6";

interface FolderNote {
  readonly type: NonNullable<ComponentProps<typeof Note>["type"]>;
  readonly text: string;
  /** The owner changes the state in the sharing popover */
  readonly canOpenPopover: boolean;
}

/** Null when the browser runtime reads the folder, or did not tell its state yet */
const getFolderNote = ({
  folder,
  isRunning,
}: BrowserRuntimeSnapshot): FolderNote | null => {
  switch (folder.state) {
    case LogFolderState.Checking:
      return null;

    case LogFolderState.NotSupported:
      return {
        type: "warning",
        text: `${BROWSER_NOT_SUPPORTED_TEXT} Du siehst hier nur die Einträge anderer und deine Einträge von anderen Rechnern.`,
        canOpenPopover: false,
      };

    case LogFolderState.NotSelected:
      return {
        type: "info",
        text: "Wähle im Remote Control Program den Ordner deiner Star-Citizen-Installation aus, damit der Log Analyzer auch deine eigenen Einträge anzeigt.",
        canOpenPopover: true,
      };

    case LogFolderState.PermissionNeeded:
      return {
        type: "warning",
        text: `Der Browser braucht erneut deine Erlaubnis, um ${folder.name ? `den Ordner „${folder.name}“` : "deinen Log-Ordner"} zu lesen. Du kannst sie im Remote Control Program erteilen.`,
        canOpenPopover: true,
      };

    case LogFolderState.Granted:
      return isRunning
        ? null
        : {
            type: "info",
            text: "Die Runtime ist gestoppt, deshalb werden deine Logs gerade nicht gelesen. Du kannst sie im Remote Control Program starten.",
            canOpenPopover: true,
          };

    default:
      throw new Error(`Unknown folder state: ${folder.state satisfies never}`);
  }
};

/**
 * Tells why the own entries are missing. The Log Analyzer has no own UI for
 * the folder: it opens the sharing popover (see "Sharing popover" of
 * `docs/remote-control-program/README.md`).
 */
export const LogFolderNote = () => {
  const runtime = useBrowserRuntime();
  const opener = useSharingPopoverOpener();

  if (!runtime) return null;

  const note = getFolderNote(runtime.state);
  if (!note) return null;

  return (
    <Note
      type={note.type}
      message={
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <p>{note.text}</p>

          {note.canOpenPopover && opener && (
            <Button2
              type="button"
              variant={Button2Variant.Secondary}
              onClick={() => opener.open(SharingPopoverTab.Browser)}
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
