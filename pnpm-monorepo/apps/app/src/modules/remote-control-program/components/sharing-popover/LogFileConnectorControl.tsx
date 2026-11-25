"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
import { ConnectorId } from "@sam-monorepo/domain";
import {
  ChannelEndReason,
  type BrowserRuntimeState,
} from "@sam-monorepo/remote-control-program-runtime";
import toast from "react-hot-toast";
import { FaFolderOpen, FaKey } from "react-icons/fa6";
import {
  LogFolderState,
  type BrowserRuntimeHandle,
  type BrowserRuntimeSnapshot,
} from "../../runtime/types";
import { LOG_ENTRIES_HISTORY_TEXT } from "../../utils/remoteControlProgramTexts";
import {
  BROWSER_RUNTIME_ERROR_TEXTS,
  formatEntryCount,
} from "./browserRuntimeTexts";
import { CONNECTOR_LABELS } from "./catalogTexts";
import { LogEntryTypeSettings } from "./LogEntryTypeSettings";
import { SharingPopoverSubsection } from "./SharingPopoverSection";
import { useRuntimeCommand } from "./useRuntimeCommand";

const getFolderText = ({ folder }: BrowserRuntimeSnapshot) => {
  switch (folder.state) {
    case LogFolderState.Checking:
      return "Wird geprüft …";

    case LogFolderState.NotSupported:
      return "Nicht unterstützt";

    case LogFolderState.NotSelected:
      return "Nicht ausgewählt";

    case LogFolderState.PermissionNeeded:
      return `${folder.name ?? "Ordner"} (Zugriff nötig)`;

    case LogFolderState.Granted:
      return folder.name ?? "Ausgewählt";

    default:
      throw new Error(`Unknown folder state: ${folder.state satisfies never}`);
  }
};

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/** The folder of the log file connector and its rules of the local access layer */
export const LogFileConnectorControl = ({ runtime }: Props) => {
  const { state, commands } = runtime;
  const folderText = getFolderText(state);

  return (
    <SharingPopoverSubsection
      heading={CONNECTOR_LABELS[ConnectorId.LogFile]}
      action={<FolderButton runtime={runtime} />}
    >
      {state.folder.state === LogFolderState.PermissionNeeded && (
        <Note
          type="warning"
          message={`Der Browser braucht erneut deine Erlaubnis, um den Ordner „${state.folder.name}“ zu lesen.`}
        />
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-400">
        <dt className="text-neutral-500">Ordner</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate" title={folderText}>
            {folderText}
          </span>

          {state.folder.state === LogFolderState.PermissionNeeded && (
            <OtherFolderButton runtime={runtime} />
          )}
        </dd>

        <dt className="text-neutral-500">Zuletzt gelesen</dt>
        <dd>
          {state.readProgress
            ? `Liest ${state.readProgress.readFileCount} von ${state.readProgress.fileCount} Dateien …`
            : (formatDate(state.lastReadAt) ?? "Noch nicht")}
        </dd>

        {state.channel.closeReason !== ChannelEndReason.NoRelay && (
          <>
            <dt className="text-neutral-500">Hochgeladen</dt>
            <dd>
              <UploadCountsText state={state} />
            </dd>
          </>
        )}
      </dl>

      {state.error && (
        <Note type="error" message={BROWSER_RUNTIME_ERROR_TEXTS[state.error]} />
      )}

      <div className="flex flex-col gap-2 text-sm text-neutral-400">
        <p>
          Solange die Runtime läuft, werden neue Einträge der ausgewählten Typen
          automatisch hochgeladen. Alles andere bleibt auf deinem Rechner.
        </p>
        <p>{LOG_ENTRIES_HISTORY_TEXT}</p>
      </div>

      <LogEntryTypeSettings
        logEntryTypes={state.localAccess.logEntryTypes}
        onChange={commands.setLogEntryTypes}
      />
    </SharingPopoverSubsection>
  );
};

/** The next step for the folder. One button in one place, thus the focus stays on it after the state changes. */
const getFolderAction = ({ state, commands }: BrowserRuntimeHandle) => {
  switch (state.folder.state) {
    case LogFolderState.PermissionNeeded:
      return {
        label: "Zugriff erlauben",
        icon: <FaKey />,
        command: async () => {
          if (!(await commands.restoreFolderPermission()))
            toast.error(
              "Ohne deine Erlaubnis kann SAM den Log-Ordner nicht lesen.",
            );
        },
        isNextStep: true,
      };

    case LogFolderState.Granted:
      return {
        label: "Ordner ändern",
        icon: <FaFolderOpen />,
        command: commands.selectFolder,
        isNextStep: false,
      };

    case LogFolderState.Checking:
    case LogFolderState.NotSupported:
    case LogFolderState.NotSelected:
      return {
        label: "Ordner wählen",
        icon: <FaFolderOpen />,
        command: commands.selectFolder,
        isNextStep: true,
      };

    default:
      throw new Error(
        `Unknown folder state: ${state.folder.state satisfies never}`,
      );
  }
};

const FolderButton = ({ runtime }: Props) => {
  const command = useRuntimeCommand();
  const action = getFolderAction(runtime);

  return (
    <Button2
      type="button"
      variant={
        action.isNextStep ? Button2Variant.Primary : Button2Variant.Secondary
      }
      colorSchema={
        action.isNextStep
          ? Button2ColorSchema.Interaction
          : Button2ColorSchema.InteractionMuted
      }
      disabled={
        command.isPending ||
        runtime.state.folder.state === LogFolderState.Checking
      }
      onClick={() => void command.run(action.command)}
      className="flex-none"
    >
      {command.isPending ? <AsciiSpinner /> : action.icon}
      {action.label}
    </Button2>
  );
};

const OtherFolderButton = ({ runtime }: Props) => {
  const command = useRuntimeCommand();

  return (
    <button
      type="button"
      disabled={command.isPending}
      onClick={() => void command.run(runtime.commands.selectFolder)}
      className="ml-auto flex-none cursor-pointer font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300 disabled:cursor-default disabled:opacity-50"
    >
      Anderer Ordner
    </button>
  );
};

interface UploadCountsTextProps {
  readonly state: BrowserRuntimeState;
}

const UploadCountsText = ({ state }: UploadCountsTextProps) => {
  const { acceptedEntryCount, newEntryCount, droppedEntryCount } =
    state.uploadCounts;

  return (
    <>
      {formatEntryCount(acceptedEntryCount)}
      {newEntryCount > 0 && ` (${newEntryCount.toLocaleString("de")} neu)`}
      {droppedEntryCount > 0 &&
        `, ${droppedEntryCount.toLocaleString("de")} verworfen`}
    </>
  );
};
