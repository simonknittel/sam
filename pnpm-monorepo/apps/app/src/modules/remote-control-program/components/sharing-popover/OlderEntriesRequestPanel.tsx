"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  ChannelStatus,
} from "@sam-monorepo/remote-control-program-runtime";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import toast from "react-hot-toast";
import type { BrowserRuntimeHandle } from "../../runtime/types";
import {
  BROWSER_RUNTIME_ERROR_TEXTS,
  getBrowserRuntimeErrorText,
} from "./browserRuntimeTexts";
import { formatOlderEntriesRange } from "./formatOlderEntriesRange";
import { OlderEntriesRequestFooter } from "./OlderEntriesRequestFooter";
import {
  getRuleTypesThatAreOn,
  PreparedOlderEntriesRequest,
  RecountButton,
  type PreparedRequestResult,
} from "./PreparedOlderEntriesRequest";
import type { OlderEntriesRequestDraft } from "./SharingPopoverProvider";

const formatUploadText = (count: number) => {
  if (count === 0)
    return "Es wurde nichts hochgeladen, weil die Typen nicht mehr ausgewählt sind.";
  if (count === 1) return "1 Eintrag wird hochgeladen.";
  return `${count.toLocaleString("de")} Einträge werden hochgeladen.`;
};

interface Props {
  readonly request: OlderEntriesRequestDraft;
  readonly runtime: BrowserRuntimeHandle;
  /** After the upload, and after "Abbrechen" */
  readonly onEnd: () => void;
}

/**
 * The request for older entries of a control UI: the count and the
 * confirmation of the owner. Only the types that are on go up (decision 27).
 */
export const OlderEntriesRequestPanel = ({
  request,
  runtime,
  onEnd,
}: Props) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-secondary border border-interaction-500/50 p-3"
    >
      <div className="flex flex-col gap-0.5">
        <h4 id={headingId} className="flex items-center gap-2 font-bold">
          {/* The prompt waits for the owner, like the folder permission */}
          <span
            aria-hidden
            className="size-2 flex-none rounded-full bg-yellow-500"
          />
          Ältere Game Logs hochladen?
        </h4>
        <p className="text-sm text-neutral-400">
          Zeitraum: {formatOlderEntriesRange(request.range)}
        </p>
      </div>

      <RequestContent request={request} runtime={runtime} onEnd={onEnd} />
    </section>
  );
};

/** The count of the runtime, and the confirmation */
const RequestContent = ({ request, runtime, onEnd }: Props) => {
  const { state, commands } = runtime;
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmErrorText, setConfirmErrorText] = useState<string | null>(null);

  // The runtime refuses the request after the end of the channel: no relay, or a refused token
  const canPrepare =
    state.isRunning && state.channel.status !== ChannelStatus.Ended;

  /**
   * A new start of the runtime forgets the prepared request, thus the key
   * contains `canPrepare`, and the cache forgets a request without a
   * component that shows it
   */
  // `request.key` stands for the range. The types that are on are a snapshot of the start of the count: a later change shows a note and "Neu zählen".
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const query = useQuery({
    queryKey: [
      "remoteControlProgram",
      "olderEntriesRequest",
      request.key,
      canPrepare,
    ],
    queryFn: async (): Promise<PreparedRequestResult> => ({
      ruleTypesThatWereOn: getRuleTypesThatAreOn(
        state.localAccess.logEntryTypes,
      ),
      prepared: await commands.prepareOlderEntriesRequest(request.range),
    }),
    enabled: canPrepare,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });

  const confirm = async (requestId: string) => {
    setIsConfirming(true);
    setConfirmErrorText(null);

    try {
      const count = await commands.confirmOlderEntriesRequest(requestId);
      toast.success(formatUploadText(count));
      onEnd();
      return;
    } catch (error) {
      setConfirmErrorText(getBrowserRuntimeErrorText(error));
      if (
        error instanceof BrowserRuntimeError &&
        error.code === BrowserRuntimeErrorCode.RequestExpired
      )
        void query.refetch();
    }

    setIsConfirming(false);
  };

  if (!state.isRunning)
    return (
      <>
        <Note
          type="info"
          message="Die Runtime läuft gerade nicht. Starte sie, damit die Einträge gezählt werden können."
        />
        <OlderEntriesRequestFooter onCancel={onEnd} />
      </>
    );

  if (!canPrepare)
    return (
      <>
        <Note
          type="error"
          message={
            BROWSER_RUNTIME_ERROR_TEXTS[
              BrowserRuntimeErrorCode.RelayNotAvailable
            ]
          }
        />
        <OlderEntriesRequestFooter onCancel={onEnd} />
      </>
    );

  if (query.isFetching)
    return (
      <>
        <LoadingText text="Einträge werden gezählt …" />
        <OlderEntriesRequestFooter onCancel={onEnd} />
      </>
    );

  if (query.isError)
    return (
      <>
        <Note type="error" message={getBrowserRuntimeErrorText(query.error)} />
        <RecountButton onClick={() => void query.refetch()} />
        <OlderEntriesRequestFooter onCancel={onEnd} />
      </>
    );

  if (!query.data) return null;

  return (
    <PreparedOlderEntriesRequest
      state={state}
      result={query.data}
      isConfirming={isConfirming}
      confirmErrorText={confirmErrorText}
      onConfirm={() => void confirm(query.data.prepared.id)}
      onCancel={onEnd}
      onRecount={() => void query.refetch()}
    />
  );
};

interface LoadingTextProps {
  readonly text: string;
}

const LoadingText = ({ text }: LoadingTextProps) => {
  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-neutral-500"
    >
      <AsciiSpinner />
      {text}
    </p>
  );
};
