"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { ConnectorId } from "@sam-monorepo/domain";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaFolderOpen, FaKey } from "react-icons/fa6";
import {
  LogFolderState,
  type BrowserRuntimeHandle,
  type BrowserRuntimeSnapshot,
} from "../../runtime/types";
import { BROWSER_RUNTIME_ERROR_TEXTS } from "./browserRuntimeTexts";
import { CONNECTOR_LABELS } from "./catalogTexts";
import { formatLogEntryTypeCount } from "./logEntryTypeRules";
import { LogEntryTypeSettings } from "./LogEntryTypeSettings";
import { LogFileConnectorGuide } from "./LogFileConnectorGuide";
import { OlderEntriesUpload } from "./OlderEntriesUpload";
import { SharingPopoverCollapsible } from "./SharingPopoverCollapsible";
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

/**
 * A problem that stops the connector and that the owner must solve: the
 * browser needs the permission for the folder again, or the runtime has an
 * error. A step of the setup (no folder, no type that is on) is not a
 * problem.
 */
const hasProblem = ({ folder, error }: BrowserRuntimeSnapshot) =>
  folder.state === LogFolderState.PermissionNeeded || error !== null;

/**
 * The part is closed by default and a direct link opens it. It also opens
 * when a problem starts, because the problem is visible only inside the
 * part. It does not close by itself, and the owner can close it.
 */
const useIsExpandedForProblem = (
  isProblem: boolean,
  isExpanded: boolean,
  onExpandedChange: (isExpanded: boolean) => void,
) => {
  const [isOpenForProblem, setIsOpenForProblem] = useState(isProblem);
  const [wasProblem, setWasProblem] = useState(isProblem);
  if (isProblem !== wasProblem) {
    setWasProblem(isProblem);
    if (isProblem) setIsOpenForProblem(true);
  }

  const changeExpanded = (nextIsExpanded: boolean) => {
    setIsOpenForProblem(false);
    onExpandedChange(nextIsExpanded);
  };

  return [isOpenForProblem || isExpanded, changeExpanded] as const;
};

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

interface ControlProps extends Props {
  readonly isExpanded: boolean;
  readonly onExpandedChange: (isExpanded: boolean) => void;
}

/** The folder of the log file connector and its rules of the local access layer */
export const LogFileConnectorControl = ({
  runtime,
  isExpanded,
  onExpandedChange,
}: ControlProps) => {
  const { state, commands } = runtime;
  const folderText = getFolderText(state);
  const [isPartExpanded, changePartExpanded] = useIsExpandedForProblem(
    hasProblem(state),
    isExpanded,
    onExpandedChange,
  );

  return (
    <SharingPopoverCollapsible
      heading={CONNECTOR_LABELS[ConnectorId.LogFile]}
      summary={
        isPartExpanded
          ? null
          : `${folderText}, ${formatLogEntryTypeCount(state.localAccess.logEntryTypes)} Typen`
      }
      progressText={state.isReading ? "Logs werden gelesen …" : null}
      isExpanded={isPartExpanded}
      onExpandedChange={changePartExpanded}
    >
      <p className="text-sm text-neutral-400">
        Dieser Connector liest die Log-Dateien von Star Citizen und lädt daraus
        neue Einträge der ausgewählten Typen hoch.
      </p>

      <LogFileConnectorGuide />

      {state.folder.state === LogFolderState.PermissionNeeded && (
        <Note
          type="warning"
          message={`Der Browser braucht erneut deine Erlaubnis, um den Ordner „${state.folder.name}“ zu lesen.`}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <dl className="grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-400">
          <dt className="text-neutral-500">Ordner</dt>
          <dd className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate" title={folderText}>
              {folderText}
            </span>

            {state.folder.state === LogFolderState.PermissionNeeded && (
              <OtherFolderButton runtime={runtime} />
            )}
          </dd>
        </dl>

        <FolderButton runtime={runtime} />
      </div>

      {state.error && (
        <Note type="error" message={BROWSER_RUNTIME_ERROR_TEXTS[state.error]} />
      )}

      <LogEntryTypeSettings
        logEntryTypes={state.localAccess.logEntryTypes}
        onChange={commands.setLogEntryTypes}
      />

      {/* Only the log files of this browser have entries to upload */}
      {state.folder.state === LogFolderState.Granted && (
        <OlderEntriesUpload runtime={runtime} />
      )}
    </SharingPopoverCollapsible>
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
