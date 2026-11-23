"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
import { RelayCloseReason } from "@sam-monorepo/domain";
import {
  ChannelEndReason,
  ChannelStatus,
  type BrowserRuntimeState,
  type ChannelCloseReason,
} from "@sam-monorepo/remote-control-program-runtime";
import clsx from "clsx";
import { useId } from "react";
import toast from "react-hot-toast";
import {
  FaCirclePlay,
  FaCircleStop,
  FaFolderOpen,
  FaKey,
  FaRotateRight,
} from "react-icons/fa6";
import {
  LogFolderState,
  type BrowserRuntimeHandle,
  type BrowserRuntimeSnapshot,
} from "../../runtime/types";
import {
  BROWSER_RUNTIME_ERROR_TEXTS,
  CHANNEL_CLOSE_REASON_TEXTS,
  formatEntryCount,
  getRelayStatusText,
} from "./browserRuntimeTexts";
import { CAPABILITY_LABELS, CONNECTOR_LABELS } from "./catalogTexts";
import { useRuntimeCommand } from "./useRuntimeCommand";

const LINK_BUTTON_CLASS_NAME =
  "cursor-pointer font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300 disabled:cursor-default disabled:opacity-50";

enum RunState {
  /** The tab of the runtime did not tell the state of the folder yet */
  Checking = "checking",
  Running = "running",
  WaitingForFolderPermission = "waiting_for_folder_permission",
  Stopped = "stopped",
}

const RUN_STATE_TEXTS: Readonly<Record<RunState, string>> = {
  [RunState.Checking]: "wird geprüft …",
  [RunState.Running]: "läuft",
  [RunState.WaitingForFolderPermission]: "wartet auf deine Erlaubnis",
  [RunState.Stopped]: "gestoppt",
};

const getRunState = (state: BrowserRuntimeSnapshot) => {
  if (state.isRunning) return RunState.Running;
  if (state.isWaitingForFolderPermission)
    return RunState.WaitingForFolderPermission;
  if (state.folder.state === LogFolderState.Checking) return RunState.Checking;
  return RunState.Stopped;
};

const getFolderText = ({ folder }: BrowserRuntimeSnapshot) => {
  switch (folder.state) {
    case LogFolderState.Checking:
      return "wird geprüft …";

    case LogFolderState.NotSupported:
      return "nicht unterstützt";

    case LogFolderState.NotSelected:
      return "nicht ausgewählt";

    case LogFolderState.PermissionNeeded:
      return `${folder.name ?? "Ordner"} (Zugriff nötig)`;

    case LogFolderState.Granted:
      return folder.name ?? "ausgewählt";

    default:
      throw new Error(`Unknown folder state: ${folder.state satisfies never}`);
  }
};

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/**
 * The browser runtime of this browser: its state, the start and the stop,
 * the log folder, the connection to the relay and the autostart
 */
export const BrowserRuntimeControl = ({ runtime }: Props) => {
  const { state, commands } = runtime;
  const command = useRuntimeCommand();
  const runState = getRunState(state);
  const folderText = getFolderText(state);
  const hasFolder =
    state.folder.state === LogFolderState.Granted ||
    state.folder.state === LogFolderState.PermissionNeeded;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={clsx("size-2 flex-none rounded-full", {
            "bg-green-500": runState === RunState.Running,
            "bg-yellow-500": runState === RunState.WaitingForFolderPermission,
            "bg-neutral-600":
              runState === RunState.Stopped || runState === RunState.Checking,
          })}
        />

        <p aria-live="polite" className="flex-1 text-sm font-bold">
          Laufzeit: {RUN_STATE_TEXTS[runState]}
        </p>

        <PrimaryAction
          runtime={runtime}
          isPending={command.isPending}
          run={command.run}
        />
      </div>

      {state.folder.state === LogFolderState.PermissionNeeded && (
        <Note
          type="warning"
          message={
            state.isWaitingForFolderPermission
              ? `Die Laufzeit soll laufen. Der Browser braucht aber deine Erlaubnis, um den Log-Ordner „${state.folder.name}“ wieder zu lesen.`
              : `Der Browser braucht deine Erlaubnis, um den Log-Ordner „${state.folder.name}“ wieder zu lesen.`
          }
        />
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-400">
        <dt className="text-neutral-500">Log-Ordner</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate" title={folderText}>
            {folderText}
          </span>

          {hasFolder && (
            <button
              type="button"
              aria-label="Anderen Log-Ordner wählen"
              disabled={command.isPending}
              onClick={() => void command.run(commands.selectFolder)}
              className={clsx(LINK_BUTTON_CLASS_NAME, "ml-auto flex-none")}
            >
              Ändern
            </button>
          )}
        </dd>

        <dt className="text-neutral-500">Verbindung</dt>
        <dd>{getRelayStatusText(state)}</dd>

        <dt className="text-neutral-500">Zuletzt gelesen</dt>
        <dd>
          {state.readProgress
            ? `Liest ${state.readProgress.readFileCount} von ${state.readProgress.fileCount} Dateien …`
            : (formatDate(state.lastReadAt) ?? "noch nicht")}
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

      <RelayNotes state={state} />

      <AutostartToggle
        isEnabled={state.isAutostartEnabled}
        onChange={commands.setAutostartEnabled}
      />
    </div>
  );
};

/** The action of the primary button for the state of the runtime */
const getPrimaryAction = ({ state, commands }: BrowserRuntimeHandle) => {
  if (state.isRunning)
    return {
      label: "Stoppen",
      icon: <FaCircleStop />,
      command: commands.stop,
      isStop: true,
    };

  switch (state.folder.state) {
    case LogFolderState.NotSelected:
      return {
        label: "Ordner wählen",
        icon: <FaFolderOpen />,
        command: commands.selectFolder,
        isStop: false,
      };

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
        isStop: false,
      };

    case LogFolderState.Checking:
    case LogFolderState.NotSupported:
    case LogFolderState.Granted:
      return {
        label: "Starten",
        icon: <FaCirclePlay />,
        command: commands.start,
        isStop: false,
      };

    default:
      throw new Error(
        `Unknown folder state: ${state.folder.state satisfies never}`,
      );
  }
};

interface PrimaryActionProps {
  readonly runtime: BrowserRuntimeHandle;
  readonly isPending: boolean;
  readonly run: (command: () => Promise<unknown>) => Promise<void>;
}

/**
 * Stop, start, or the step that the start needs first. One button in one
 * place, thus the focus stays on it after the state changes.
 */
const PrimaryAction = ({ runtime, isPending, run }: PrimaryActionProps) => {
  const action = getPrimaryAction(runtime);

  return (
    <Button2
      type="button"
      variant={
        action.isStop ? Button2Variant.Secondary : Button2Variant.Primary
      }
      colorSchema={
        action.isStop
          ? Button2ColorSchema.InteractionMuted
          : Button2ColorSchema.Interaction
      }
      disabled={
        isPending || runtime.state.folder.state === LogFolderState.Checking
      }
      onClick={() => void run(action.command)}
      className="flex-none"
    >
      {isPending ? <AsciiSpinner /> : action.icon}
      {action.label}
    </Button2>
  );
};

interface StateProps {
  readonly state: BrowserRuntimeState;
}

const UploadCountsText = ({ state }: StateProps) => {
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

/** Why this browser uploads nothing: no relay, a refusal, a close or a switch */
const RelayNotes = ({ state }: StateProps) => {
  const { channel } = state;
  const turnedOffLabels = [
    ...channel.turnedOffConnectorIds.map(
      (connectorId) => CONNECTOR_LABELS[connectorId],
    ),
    ...channel.turnedOffCapabilityIds.map(
      (capabilityId) => CAPABILITY_LABELS[capabilityId],
    ),
  ];
  const { closeReason } = channel;
  const showsCloseReason =
    closeReason !== null && channel.status !== ChannelStatus.Connected;

  return (
    <>
      {state.isRunning && turnedOffLabels.length > 0 && (
        <Note
          type="warning"
          message={`Die Organisation hat abgeschaltet: ${turnedOffLabels.join(", ")}. Dieser Browser lädt davon nichts hoch.`}
        />
      )}

      {showsCloseReason && <CloseReasonNote closeReason={closeReason} />}
    </>
  );
};

interface CloseReasonNoteProps {
  readonly closeReason: ChannelCloseReason;
}

const CloseReasonNote = ({ closeReason }: CloseReasonNoteProps) => {
  const text = CHANNEL_CLOSE_REASON_TEXTS[closeReason];

  switch (closeReason) {
    case RelayCloseReason.UpdateNecessary:
    case ChannelEndReason.SessionExpired:
    case ChannelEndReason.CitizenChanged:
      return (
        <div className="flex flex-col gap-2">
          <Note type="warning" message={text} />

          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => window.location.reload()}
            className="self-start"
          >
            <FaRotateRight />
            Seite neu laden
          </Button2>
        </div>
      );

    case RelayCloseReason.AccessDenied:
    case RelayCloseReason.ProgramTurnedOff:
    case RelayCloseReason.TooManyRuntimes:
    case RelayCloseReason.ProtocolVersionTooNew:
      return <Note type="error" message={text} />;

    case RelayCloseReason.TokenNotValid:
    case RelayCloseReason.RelayServiceRestart:
    case RelayCloseReason.TooManyErrors:
    case RelayCloseReason.Replaced:
    case RelayCloseReason.HeartbeatMissing:
    case ChannelEndReason.NoRelay:
      return <Note type="info" message={text} />;

    default:
      throw new Error(`Unknown close reason: ${closeReason satisfies never}`);
  }
};

interface AutostartToggleProps {
  readonly isEnabled: boolean;
  readonly onChange: (isEnabled: boolean) => void;
}

const AutostartToggle = ({ isEnabled, onChange }: AutostartToggleProps) => {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <YesNoCheckbox
        id={id}
        hideLabel
        checked={isEnabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <label
        htmlFor={id}
        className="cursor-pointer text-sm hover:text-white active:text-neutral-300"
      >
        Beim Öffnen von SAM starten
      </label>
    </div>
  );
};
