"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import {
  PATTERNS,
  SORTED_ENTRY_TYPES,
} from "@/modules/log-analyzer/utils/PATTERNS";
import type { OwnShareGrant } from "@sam-monorepo/application";
import {
  CapabilityId,
  getOldestLogAnalyzerEntryVersion,
  GranteeKind,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import type {
  OlderEntriesTimeRange,
  PreparedOlderEntriesRequest as PreparedRuntimeRequest,
} from "@sam-monorepo/remote-control-program-runtime";
import { FaCloudArrowUp, FaRotateRight } from "react-icons/fa6";
import type { BrowserRuntimeSnapshot } from "../../runtime/types";
import { formatEntryCount } from "./browserRuntimeTexts";
import { getGranteeText } from "./granteeTexts";
import type { OlderEntriesRequestDraft } from "./SharingPopoverProvider";
import { useSharingPopoverQuery } from "./useSharingPopoverQuery";

/** The rule type of each list type: the lists show the newest version */
const LIST_TYPE_BY_RULE_TYPE = new Map(
  SORTED_ENTRY_TYPES.map((type) => [
    getOldestLogAnalyzerEntryVersion(type),
    type,
  ]),
);

export const getRuleTypesThatAreOn = (
  logEntryTypes: Readonly<Record<LogAnalyzerEntryType, boolean>>,
) =>
  new Set(
    Object.values(LogAnalyzerEntryType)
      .filter((type) => logEntryTypes[type])
      .map(getOldestLogAnalyzerEntryVersion),
  );

/**
 * A grant gives access only to the entries from its validity period
 * (decision 8). The range and the validity are half-open.
 */
const coversRange = (grant: OwnShareGrant, range: OlderEntriesTimeRange) =>
  grant.capabilityIds.includes(CapabilityId.LogEntries) &&
  (range.end === null || grant.startsAt < range.end) &&
  (range.start === null || grant.endsAt === null || grant.endsAt > range.start);

/** Who can read the entries of the range after the upload */
const getViewerText = (
  grants: readonly OwnShareGrant[] | undefined,
  range: OlderEntriesTimeRange,
) => {
  if (!grants)
    return "Du und alle, deren Freigabe den Zeitraum der Einträge abdeckt.";

  const coveringGrants = grants.filter((grant) => coversRange(grant, range));
  if (coveringGrants.length === 0)
    return "Nur du: Keine deiner Freigaben deckt den Zeitraum ab.";
  if (
    coveringGrants.some((grant) => grant.grantee.kind === GranteeKind.everyone)
  )
    return "Alle, die das Remote Control Program nutzen: Eine deiner Freigaben gilt für alle.";

  return `Du und ${coveringGrants.map((grant) => getGranteeText(grant.grantee)).join(", ")}.`;
};

/** Nothing goes up during a "Stop all" (see `confirmOlderEntriesRequest`) */
const getBlockingText = (state: BrowserRuntimeSnapshot) => {
  if (state.localAccess.stoppedAt)
    return "In diesem Browser ist alles gestoppt. Starte ihn zuerst.";
  if (state.channel.isStoppedByOwner)
    return "Alles ist gestoppt. Starte zuerst alle Laufzeiten.";
  return null;
};

export interface PreparedRequestResult {
  /** The rule types that were on at the start of the count */
  readonly ruleTypesThatWereOn: ReadonlySet<LogAnalyzerEntryType>;
  readonly prepared: PreparedRuntimeRequest;
}

interface Props {
  readonly request: OlderEntriesRequestDraft;
  readonly state: BrowserRuntimeSnapshot;
  readonly result: PreparedRequestResult;
  readonly isConfirming: boolean;
  readonly confirmErrorText: string | null;
  readonly onConfirm: () => void;
  readonly onRecount: () => void;
}

/**
 * The counts of a request for older entries, what goes up, who can read it,
 * and the confirmation. Only the counts of the types that are on now: a
 * type that is off now does not go up (see `confirmOlderEntriesRequest`).
 */
export const PreparedOlderEntriesRequest = ({
  request,
  state,
  result,
  isConfirming,
  confirmErrorText,
  onConfirm,
  onRecount,
}: Props) => {
  const { data: popoverData } = useSharingPopoverQuery();

  const ruleTypesThatAreOn = getRuleTypesThatAreOn(
    state.localAccess.logEntryTypes,
  );
  const counts = Array.from(result.prepared.countsByType)
    .filter(([ruleType]) => ruleTypesThatAreOn.has(ruleType))
    .map(([ruleType, count]) => ({
      type: LIST_TYPE_BY_RULE_TYPE.get(ruleType) ?? ruleType,
      count,
    }))
    .toSorted((first, second) =>
      PATTERNS[first.type].title.localeCompare(PATTERNS[second.type].title),
    );
  const entryCount = counts.reduce((sum, { count }) => sum + count, 0);
  const hasNewTypes = Array.from(ruleTypesThatAreOn).some(
    (ruleType) => !result.ruleTypesThatWereOn.has(ruleType),
  );
  const blockingText = getBlockingText(state);

  return (
    <div className="flex flex-col gap-3">
      {hasNewTypes && (
        <div className="flex flex-col gap-2">
          <Note
            type="info"
            message="Du hast Typen eingeschaltet. Zähle neu, damit ihre Einträge dabei sind."
          />
          <RecountButton onClick={onRecount} />
        </div>
      )}

      {entryCount > 0 ? (
        <>
          <ul className="flex flex-col gap-1 text-sm text-neutral-400">
            {counts.map(({ type, count }) => (
              <TypeCountItem key={type} type={type} count={count} />
            ))}
          </ul>

          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="text-neutral-500">Was hochgeht: </span>
              {formatEntryCount(entryCount)} aus dem Zeitraum, nur von den
              Typen, die an sind.
            </p>
            <p>
              <span className="text-neutral-500">Wer sie sieht: </span>
              {getViewerText(popoverData?.grants, request.range)} Auch eine
              spätere Freigabe mit einem Start in der Vergangenheit kann sie
              zeigen.
            </p>
            <p className="text-neutral-500">
              Hochgeladene Einträge kannst du nicht löschen.
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-neutral-400">
          {ruleTypesThatAreOn.size === 0
            ? "Kein Typ ist an. Schalte unten die Typen ein, die du teilen willst."
            : "Im Zeitraum gibt es keine Einträge, die noch nicht hochgeladen sind."}
        </p>
      )}

      {blockingText && entryCount > 0 && (
        <Note type="warning" message={blockingText} />
      )}

      {confirmErrorText && (
        <div role="alert">
          <Note type="error" message={confirmErrorText} />
        </div>
      )}

      {entryCount > 0 && (
        <Button2
          type="button"
          disabled={isConfirming || blockingText !== null}
          onClick={onConfirm}
          className="self-end"
        >
          {isConfirming ? <AsciiSpinner /> : <FaCloudArrowUp />}
          {formatEntryCount(entryCount)} hochladen
        </Button2>
      )}
    </div>
  );
};

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

interface TypeCountItemProps {
  readonly type: LogAnalyzerEntryType;
  readonly count: number;
}

const TypeCountItem = ({ type, count }: TypeCountItemProps) => {
  const { title, icon: Icon } = PATTERNS[type];

  return (
    <li className="flex items-center gap-2">
      <Icon aria-hidden className="flex-none text-white/40" />

      <span className="min-w-0 flex-1 truncate" title={title}>
        {title}
      </span>

      <span>{count.toLocaleString("de")}</span>
    </li>
  );
};
