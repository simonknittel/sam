"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import {
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import type { PreparedOlderEntriesRequest as PreparedRuntimeRequest } from "@sam-monorepo/remote-control-program-runtime";
import { FaCloudArrowUp, FaRotateRight } from "react-icons/fa6";
import type { BrowserRuntimeSnapshot } from "../../runtime/types";
import { formatEntryCount } from "./browserRuntimeTexts";
import { OlderEntriesRequestFooter } from "./OlderEntriesRequestFooter";

export const getRuleTypesThatAreOn = (
  logEntryTypes: Readonly<Record<LogAnalyzerEntryType, boolean>>,
) =>
  new Set(
    Object.values(LogAnalyzerEntryType)
      .filter((type) => logEntryTypes[type])
      .map(getOldestLogAnalyzerEntryVersion),
  );

export interface PreparedRequestResult {
  /** The rule types that were on at the start of the count */
  readonly ruleTypesThatWereOn: ReadonlySet<LogAnalyzerEntryType>;
  readonly prepared: PreparedRuntimeRequest;
}

interface Props {
  readonly state: BrowserRuntimeSnapshot;
  readonly result: PreparedRequestResult;
  readonly isConfirming: boolean;
  readonly confirmErrorText: string | null;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onRecount: () => void;
}

/**
 * The count of a request for older entries and the confirmation. It counts
 * only the types that are on now: a type that is off now does not go up (see
 * `confirmOlderEntriesRequest`).
 */
export const PreparedOlderEntriesRequest = ({
  state,
  result,
  isConfirming,
  confirmErrorText,
  onConfirm,
  onCancel,
  onRecount,
}: Props) => {
  const ruleTypesThatAreOn = getRuleTypesThatAreOn(
    state.localAccess.logEntryTypes,
  );
  const entryCount = Array.from(result.prepared.countsByType)
    .filter(([ruleType]) => ruleTypesThatAreOn.has(ruleType))
    .reduce((sum, [, count]) => sum + count, 0);
  const hasNewTypes = Array.from(ruleTypesThatAreOn).some(
    (ruleType) => !result.ruleTypesThatWereOn.has(ruleType),
  );
  // Nothing goes up during a "Stop all" (see `confirmOlderEntriesRequest`)
  const isStopped = state.channel.isStoppedByOwner;

  return (
    <>
      {hasNewTypes && (
        <div className="flex flex-col gap-2">
          <Note
            type="info"
            message="Du hast weitere Typen ausgewählt. Zähle die Einträge neu, damit sie dabei sind."
          />
          <RecountButton onClick={onRecount} />
        </div>
      )}

      <p className="text-sm">
        {entryCount > 0
          ? formatEntryCount(entryCount)
          : getEmptyText(ruleTypesThatAreOn.size)}
      </p>

      {isStopped && entryCount > 0 && (
        <Note
          type="warning"
          message="Gerade ist alles gestoppt. Starte zuerst wieder unter „Status“."
        />
      )}

      {confirmErrorText && (
        <div role="alert">
          <Note type="error" message={confirmErrorText} />
        </div>
      )}

      <OlderEntriesRequestFooter onCancel={onCancel}>
        {entryCount > 0 && (
          <Button2
            type="button"
            disabled={isConfirming || isStopped}
            onClick={onConfirm}
          >
            {isConfirming ? <AsciiSpinner /> : <FaCloudArrowUp />}
            Hochladen
          </Button2>
        )}
      </OlderEntriesRequestFooter>
    </>
  );
};

const getEmptyText = (selectedTypeCount: number) =>
  selectedTypeCount === 0
    ? "Du hast noch keine Typen ausgewählt. Wähle unten aus, was hochgeladen werden soll."
    : "In diesem Zeitraum gibt es keine weiteren Einträge zum Hochladen.";

interface RecountButtonProps {
  readonly onClick: () => void;
}

export const RecountButton = ({ onClick }: RecountButtonProps) => {
  return (
    <Button2
      type="button"
      variant={Button2Variant.Secondary}
      onClick={onClick}
      className="self-start"
    >
      <FaRotateRight />
      Neu zählen
    </Button2>
  );
};
