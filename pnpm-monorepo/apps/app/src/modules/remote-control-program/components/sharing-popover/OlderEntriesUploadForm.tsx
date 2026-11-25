"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { DateRangeFields } from "@/modules/log-analyzer/components/DateRangeFields";
import {
  hasDateRange,
  NO_DATE_RANGE,
  toEntryWindow,
  type DateRange,
} from "@/modules/log-analyzer/utils/entryWindow";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { useRef, useState, type SubmitEvent } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import type { BrowserRuntimeHandle } from "../../runtime/types";
import {
  OlderEntriesRequest,
  type OlderEntriesRequestDraft,
} from "./OlderEntriesRequest";

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/** The date range, then the count of its entries and the confirmation */
export const OlderEntriesUploadForm = ({ runtime }: Props) => {
  const [today] = useState(() =>
    getLocalDateKey(new Date(), ORGANIZATION_TIMEZONE),
  );
  const [dateRange, setDateRange] = useState(NO_DATE_RANGE);
  const [request, setRequest] = useState<OlderEntriesRequestDraft | null>(null);
  const countButtonRef = useRef<HTMLButtonElement>(null);

  /** The count belongs to the date range that it counted */
  const changeDateRange = (nextDateRange: DateRange) => {
    setDateRange(nextDateRange);
    setRequest(null);
  };

  const count = (countedDateRange: DateRange) => {
    setDateRange(countedDateRange);
    setRequest({
      key: crypto.randomUUID(),
      range: toEntryWindow(countedDateRange),
    });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    count(dateRange);
  };

  /** The focus was on the button of the upload, which disappears */
  const endRequest = () => {
    setRequest(null);
    countButtonRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ältere Game Logs hochladen"
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-neutral-400">
        Wähle den Zeitraum, dessen Einträge du nachträglich hochladen möchtest.
      </p>

      <DateRangeFields
        value={dateRange}
        onChange={changeDateRange}
        onPreset={count}
        today={today}
        oldestSessionStart={runtime.state.oldestSessionStart}
      />

      <Button2
        ref={countButtonRef}
        type="submit"
        variant={Button2Variant.Secondary}
        disabled={!hasDateRange(dateRange)}
        className="self-end"
      >
        <FaMagnifyingGlass />
        Einträge zählen
      </Button2>

      {request && (
        <OlderEntriesRequest
          key={request.key}
          request={request}
          runtime={runtime}
          onEnd={endRequest}
        />
      )}
    </form>
  );
};
