"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import {
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  type OlderEntriesTimeRange,
  type PreparedOlderEntriesRequest,
} from "@sam-monorepo/remote-control-program-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaCloudArrowUp } from "react-icons/fa6";
import type { BrowserRuntimeHandle } from "../../runtime/types";
import { getBrowserRuntimeErrorText } from "./browserRuntimeTexts";
import type { LogEntryTypeRules } from "./logEntryTypeRules";

export interface OlderEntriesRequestDraft {
  /** Each count has a new key, also for the same range */
  readonly key: string;
  readonly range: OlderEntriesTimeRange;
}

interface RequestResult {
  /** The rule types that were on at the start of the count */
  readonly ruleTypesThatWereOn: ReadonlySet<LogAnalyzerEntryType>;
  readonly prepared: PreparedOlderEntriesRequest;
}

const getRuleTypesThatAreOn = (logEntryTypes: LogEntryTypeRules) =>
  new Set(
    Object.values(LogAnalyzerEntryType)
      .filter((type) => logEntryTypes[type])
      .map(getOldestLogAnalyzerEntryVersion),
  );

const formatUploadText = (count: number) => {
  if (count === 0)
    return "Es wurde nichts hochgeladen, weil die Typen nicht mehr ausgewählt sind.";
  if (count === 1) return "1 Eintrag wird hochgeladen.";
  return `${count.toLocaleString("de")} Einträge werden hochgeladen.`;
};

const getEmptyText = (selectedTypeCount: number) =>
  selectedTypeCount === 0
    ? "Du hast noch keine Typen ausgewählt. Wähle oben aus, was hochgeladen werden soll."
    : "In diesem Zeitraum gibt es keine weiteren Einträge zum Hochladen.";

interface Props {
  readonly request: OlderEntriesRequestDraft;
  readonly runtime: BrowserRuntimeHandle;
  /** After the upload */
  readonly onEnd: () => void;
}

/**
 * The count of the runtime and the confirmation of the owner. Only the types
 * that are on go up (decision 27).
 */
export const OlderEntriesRequest = ({ request, runtime, onEnd }: Props) => {
  const { state, commands } = runtime;
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmErrorText, setConfirmErrorText] = useState<string | null>(null);

  // `request.key` stands for the range. The types that are on are a snapshot of the start of the count: a later change shows a note.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const query = useQuery({
    queryKey: ["remoteControlProgram", "olderEntriesRequest", request.key],
    queryFn: async (): Promise<RequestResult> => ({
      ruleTypesThatWereOn: getRuleTypesThatAreOn(
        state.localAccess.logEntryTypes,
      ),
      prepared: await commands.prepareOlderEntriesRequest(request.range),
    }),
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

  if (query.isFetching)
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-neutral-500"
      >
        <AsciiSpinner />
        Einträge werden gezählt …
      </p>
    );

  if (query.isError)
    return (
      <div role="alert">
        <Note type="error" message={getBrowserRuntimeErrorText(query.error)} />
      </div>
    );

  if (!query.data) return null;

  const { prepared, ruleTypesThatWereOn } = query.data;
  // A type that is off now does not go up (see `confirmOlderEntriesRequest`)
  const ruleTypesThatAreOn = getRuleTypesThatAreOn(
    state.localAccess.logEntryTypes,
  );
  const entryCount = Array.from(prepared.countsByType)
    .filter(([ruleType]) => ruleTypesThatAreOn.has(ruleType))
    .reduce((sum, [, count]) => sum + count, 0);
  const hasNewTypes = Array.from(ruleTypesThatAreOn).some(
    (ruleType) => !ruleTypesThatWereOn.has(ruleType),
  );

  return (
    <>
      {hasNewTypes && (
        <Note
          type="info"
          message="Du hast weitere Typen ausgewählt. Zähle die Einträge neu, damit sie dabei sind."
        />
      )}

      {confirmErrorText && (
        <div role="alert">
          <Note type="error" message={confirmErrorText} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <p role="status" className="text-sm text-neutral-400">
          {entryCount > 0
            ? `Anzahl: ${entryCount.toLocaleString("de")}`
            : getEmptyText(ruleTypesThatAreOn.size)}
        </p>

        {entryCount > 0 && (
          <Button2
            type="button"
            disabled={isConfirming}
            onClick={() => void confirm(prepared.id)}
          >
            {isConfirming ? <AsciiSpinner /> : <FaCloudArrowUp />}
            Hochladen
          </Button2>
        )}
      </div>
    </>
  );
};
