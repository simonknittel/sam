"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import Note from "@/modules/common/components/Note";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { RelayCloseReason } from "@sam-monorepo/domain";
import {
  ChannelEndReason,
  ChannelStatus,
  type BrowserRuntimeState,
  type ChannelCloseReason,
} from "@sam-monorepo/remote-control-program-runtime";
import clsx from "clsx";
import { useId } from "react";
import { FaCirclePlay, FaCircleStop, FaRotateRight } from "react-icons/fa6";
import {
  LogFolderState,
  type BrowserRuntimeHandle,
  type BrowserRuntimeSnapshot,
} from "../../runtime/types";
import {
  CHANNEL_CLOSE_REASON_TEXTS,
  getRelayStatusText,
} from "./browserRuntimeTexts";
import { SharingPopoverSubsection } from "./SharingPopoverSection";
import { useRuntimeCommand } from "./useRuntimeCommand";

enum RunState {
  /** The tab of the runtime did not tell the state of the folder yet */
  Checking = "checking",
  Running = "running",
  WaitingForFolderPermission = "waiting_for_folder_permission",
  Stopped = "stopped",
}

const RUN_STATE_TEXTS: Readonly<Record<RunState, string>> = {
  [RunState.Checking]: "Wird geprüft …",
  [RunState.Running]: "Läuft",
  [RunState.WaitingForFolderPermission]: "Wartet auf deine Erlaubnis",
  [RunState.Stopped]: "Gestoppt",
};

const getRunState = (state: BrowserRuntimeSnapshot) => {
  if (state.isRunning) return RunState.Running;
  if (state.isWaitingForFolderPermission)
    return RunState.WaitingForFolderPermission;
  if (state.folder.state === LogFolderState.Checking) return RunState.Checking;
  return RunState.Stopped;
};

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/** The state of the browser runtime, its connection to the relay and the autostart */
export const BrowserRuntimeControl = ({ runtime }: Props) => {
  const { state, commands } = runtime;
  const runState = getRunState(state);

  return (
    <SharingPopoverSubsection
      heading="Runtime"
      action={<RunButton runtime={runtime} />}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-neutral-400">
        <dt className="text-neutral-500">Status</dt>
        <dd className="flex items-center gap-2">
          <RunStateDot runState={runState} />
          <span aria-live="polite">{RUN_STATE_TEXTS[runState]}</span>
        </dd>

        <dt className="text-neutral-500">Verbindung</dt>
        <dd>{getRelayStatusText(state)}</dd>
      </dl>

      <RelayNotes state={state} />

      <AutostartToggle
        isEnabled={state.isAutostartEnabled}
        onChange={commands.setAutostartEnabled}
      />
    </SharingPopoverSubsection>
  );
};

interface RunStateDotProps {
  readonly runState: RunState;
}

const RunStateDot = ({ runState }: RunStateDotProps) => {
  if (runState === RunState.WaitingForFolderPermission)
    return <UnreadDot className="flex-none" />;

  return (
    <span
      aria-hidden
      className={clsx("size-2 flex-none rounded-full", {
        "bg-green-500": runState === RunState.Running,
        "bg-neutral-600":
          runState === RunState.Stopped || runState === RunState.Checking,
      })}
    />
  );
};

/** Null without the access to the folder: the connector has the next step */
const RunButton = ({ runtime }: Props) => {
  const { state, commands } = runtime;
  const command = useRuntimeCommand();

  if (!state.isRunning && state.folder.state !== LogFolderState.Granted)
    return null;

  return (
    <Button2
      type="button"
      variant={
        state.isRunning ? Button2Variant.Secondary : Button2Variant.Primary
      }
      colorSchema={
        state.isRunning
          ? Button2ColorSchema.InteractionMuted
          : Button2ColorSchema.Interaction
      }
      disabled={command.isPending}
      onClick={() =>
        void command.run(state.isRunning ? commands.stop : commands.start)
      }
      className="flex-none"
    >
      <RunButtonIcon
        isPending={command.isPending}
        isRunning={state.isRunning}
      />
      {state.isRunning ? "Stoppen" : "Starten"}
    </Button2>
  );
};

interface RunButtonIconProps {
  readonly isPending: boolean;
  readonly isRunning: boolean;
}

const RunButtonIcon = ({ isPending, isRunning }: RunButtonIconProps) => {
  if (isPending) return <AsciiSpinner />;
  return isRunning ? <FaCircleStop /> : <FaCirclePlay />;
};

interface StateProps {
  readonly state: BrowserRuntimeState;
}

/** Why this browser uploads nothing: no relay, a refusal or a close */
const RelayNotes = ({ state }: StateProps) => {
  const { closeReason, status } = state.channel;
  if (closeReason === null || status === ChannelStatus.Connected) return null;

  return <CloseReasonNote closeReason={closeReason} />;
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
        Automatisch starten, wenn du SAM öffnest
      </label>
    </div>
  );
};
