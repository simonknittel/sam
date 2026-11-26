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

const showUploadToast = (count: number) => {
  if (count === 0) {
    toast.error("Es wurde nichts hochgeladen.");
    return;
  }

  toast.success(
    count === 1
      ? "1 Eintrag wird hochgeladen."
      : `${count.toLocaleString("de")} Einträge werden hochgeladen.`,
  );
};

const getEmptyText = (selectedTypeCount: number) =>
  selectedTypeCount === 0
    ? "Du hast noch keine Typen ausgewählt. Wähle oben aus, was hochgeladen werden soll."
    : "In diesem Zeitraum gibt es keine weiteren Einträge zum Hochladen.";

interface Props {
  readonly request: OlderEntriesRequestDraft;
  readonly runtime: BrowserRuntimeHandle;
  /** After the upload, also when the owner started a new count since */
  readonly onEnd: (key: string) => void;
  /** The runtime does not know the count any more */
  readonly onExpired: (key: string) => void;
}

/**
 * The count of the runtime and the confirmation of the owner. Only the types
 * that are on go up (decision 27).
 */
export const OlderEntriesRequest = ({
  request,
  runtime,
  onEnd,
  onExpired,
}: Props) => {
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
      showUploadToast(count);
      onEnd(request.key);
      return;
    } catch (error) {
      if (
        error instanceof BrowserRuntimeError &&
        error.code === BrowserRuntimeErrorCode.RequestExpired
      ) {
        toast.error(getBrowserRuntimeErrorText(error));
        onExpired(request.key);
        return;
      }

      setConfirmErrorText(getBrowserRuntimeErrorText(error));
    }

    setIsConfirming(false);
  };

  if (query.isError)
    return (
      <div role="alert">
        <Note type="error" message={getBrowserRuntimeErrorText(query.error)} />
      </div>
    );

  const result = query.isFetching ? null : (query.data ?? null);
  // A type that is off now does not go up (see `confirmOlderEntriesRequest`)
  const ruleTypesThatAreOn = getRuleTypesThatAreOn(
    state.localAccess.logEntryTypes,
  );
  const entryCount = result
    ? Array.from(result.prepared.countsByType)
        .filter(([ruleType]) => ruleTypesThatAreOn.has(ruleType))
        .reduce((sum, [, count]) => sum + count, 0)
    : 0;
  const hasNewTypes =
    result !== null &&
    Array.from(ruleTypesThatAreOn).some(
      (ruleType) => !result.ruleTypesThatWereOn.has(ruleType),
    );

  const getStatusText = () => {
    if (!result) return "Einträge werden gezählt …";
    if (entryCount > 0) return `Anzahl: ${entryCount.toLocaleString("de")}`;
    // The new types are not counted yet
    return hasNewTypes ? null : getEmptyText(ruleTypesThatAreOn.size);
  };

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
        {/* One element for the count and its result, thus a screen reader announces the result */}
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-neutral-400"
        >
          {!result && <AsciiSpinner />}
          {getStatusText()}
        </p>

        {result && entryCount > 0 && (
          <Button2
            type="button"
            disabled={isConfirming}
            onClick={() => void confirm(result.prepared.id)}
          >
            {isConfirming ? <AsciiSpinner /> : <FaCloudArrowUp />}
            Hochladen
          </Button2>
        )}
      </div>
    </>
  );
};
