"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
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
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  RelayAvailability,
  type OlderEntriesTimeRange,
  type PreparedOlderEntriesRequest,
} from "@sam-monorepo/remote-control-program-runtime";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import toast from "react-hot-toast";
import { FaCloudArrowUp, FaRotateRight } from "react-icons/fa6";
import type {
  BrowserRuntimeHandle,
  BrowserRuntimeSnapshot,
} from "../../runtime/types";
import {
  BROWSER_RUNTIME_ERROR_TEXTS,
  formatEntryCount,
  getBrowserRuntimeErrorText,
} from "./browserRuntimeTexts";
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

const getRuleTypesThatAreOn = (
  logEntryTypes: Readonly<Record<LogAnalyzerEntryType, boolean>>,
) =>
  new Set(
    Object.values(LogAnalyzerEntryType)
      .filter((type) => logEntryTypes[type])
      .map(getOldestLogAnalyzerEntryVersion),
  );

const formatRange = ({ start, end }: OlderEntriesTimeRange) =>
  `${start ? formatDate(start) : "Beginn deiner Logs"} bis ${end ? formatDate(end) : "jetzt"}`;

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

const formatUploadText = (count: number) => {
  if (count === 0) return "Nichts hochgeladen: Die Typen sind nicht mehr an.";
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
 * The request for older entries of a control UI: the counts for each type,
 * what goes up, who can read it, and the confirmation of the owner. Only
 * the types that are on go up (decision 27).
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
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 id={headingId} className="text-sm font-bold">
            Ältere Einträge hochladen?
          </h3>
          <p className="text-sm text-neutral-400">
            {formatRange(request.range)}
          </p>
        </div>

        {/* The first button of the popover, thus its first focus is not the upload */}
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          onClick={onEnd}
          className="flex-none"
        >
          Abbrechen
        </Button2>
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

  const canPrepare =
    state.isRunning && state.relayAvailability === RelayAvailability.Available;

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
      <Note
        type="info"
        message="Die Laufzeit läuft nicht. Starte sie unten, um die Einträge zu zählen."
      />
    );

  if (state.relayAvailability === RelayAvailability.Unknown)
    return <LoadingText text="Verbinde mit dem Relay …" />;

  if (!canPrepare)
    return (
      <Note
        type="error"
        message={
          BROWSER_RUNTIME_ERROR_TEXTS[BrowserRuntimeErrorCode.RelayNotAvailable]
        }
      />
    );

  if (query.isFetching) return <LoadingText text="Zähle die Einträge …" />;

  if (query.isError)
    return (
      <div className="flex flex-col gap-2">
        <Note type="error" message={getBrowserRuntimeErrorText(query.error)} />
        <RecountButton onClick={() => void query.refetch()} />
      </div>
    );

  if (!query.data) return null;

  return (
    <PreparedRequest
      request={request}
      runtime={runtime}
      result={query.data}
      isConfirming={isConfirming}
      confirmErrorText={confirmErrorText}
      onConfirm={() => void confirm(query.data.prepared.id)}
      onRecount={() => void query.refetch()}
    />
  );
};

interface PreparedRequestResult {
  /** The rule types that were on at the start of the count */
  readonly ruleTypesThatWereOn: ReadonlySet<LogAnalyzerEntryType>;
  readonly prepared: PreparedOlderEntriesRequest;
}

interface PreparedRequestProps {
  readonly request: OlderEntriesRequestDraft;
  readonly runtime: BrowserRuntimeHandle;
  readonly result: PreparedRequestResult;
  readonly isConfirming: boolean;
  readonly confirmErrorText: string | null;
  readonly onConfirm: () => void;
  readonly onRecount: () => void;
}

/**
 * The counts of the types that are on now: a type that is off now does not
 * go up (see `confirmOlderEntriesRequest`)
 */
const PreparedRequest = ({
  request,
  runtime: { state },
  result,
  isConfirming,
  confirmErrorText,
  onConfirm,
  onRecount,
}: PreparedRequestProps) => {
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

/** Nothing goes up during a "Stop all" (see `confirmOlderEntriesRequest`) */
const getBlockingText = (state: BrowserRuntimeSnapshot) => {
  if (state.localAccess.stoppedAt)
    return "In diesem Browser ist alles gestoppt. Starte ihn zuerst.";
  if (state.channel?.isStoppedByOwner)
    return "Alles ist gestoppt. Starte zuerst alle Laufzeiten.";
  return null;
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

interface RecountButtonProps {
  readonly onClick: () => void;
}

const RecountButton = ({ onClick }: RecountButtonProps) => {
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
