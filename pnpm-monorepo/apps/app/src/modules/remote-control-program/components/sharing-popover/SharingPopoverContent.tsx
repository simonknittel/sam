"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import { Fragment } from "react";
import { SESSION_EXPIRED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserSettingsSection } from "./BrowserSettingsSection";
import { SharedWithOthersSection } from "./SharedWithOthersSection";
import { useOlderEntriesRequest } from "./SharingPopoverProvider";
import { StatusSection } from "./StatusSection";
import { useSharingPopoverQuery } from "./useSharingPopoverQuery";

type ReadError = NonNullable<
  ReturnType<typeof useSharingPopoverQuery>["error"]
>;

/** The text of a failed read of the data of the server */
const getReadErrorText = ({ data, message }: ReadError) => {
  if (data?.code === "UNAUTHORIZED") return SESSION_EXPIRED_TEXT;
  // The procedure gives a German text (see `getSharingPopover`)
  if (data?.code === "FORBIDDEN") return message;
  return "Der Status konnte nicht geladen werden.";
};

/**
 * The content of the sharing popover in the top bar and in the bottom sheet
 * of the mobile action bar. The sections of the server data show after the
 * first read. The section of this browser shows at once, because it reads
 * only the browser. With a request for older entries of a control UI, the
 * section of this browser is the first section.
 */
export const SharingPopoverContent = () => {
  const query = useSharingPopoverQuery();
  const { data } = query;
  const olderEntriesRequest = useOlderEntriesRequest();

  // The keys keep the sections mounted when their order changes
  const statusPart = (
    <Fragment key="status">
      {query.isPending && (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <AsciiSpinner />
          Lade den Status …
        </p>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-col gap-2">
          <Note type="error" message={getReadErrorText(query.error)} />

          <button
            type="button"
            onClick={() => void query.refetch()}
            className="cursor-pointer self-start font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {data && (
        <StatusSection
          runtimes={data.runtimes}
          stoppedAt={data.stoppedAt}
          isRefreshing={query.isFetching}
        />
      )}
    </Fragment>
  );
  const browserPart = <BrowserSettingsSection key="browser" />;

  return (
    <div className="flex flex-col gap-6">
      {olderEntriesRequest.request
        ? [browserPart, statusPart]
        : [statusPart, browserPart]}

      {data && (
        <SharedWithOthersSection
          grants={data.grants}
          maximumActiveGrantCount={data.maximumActiveGrantCount}
          canChooseCitizen={data.canChooseCitizen}
          canChooseRole={data.canChooseRole}
        />
      )}
    </div>
  );
};
