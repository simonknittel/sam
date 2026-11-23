"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import { BrowserSettingsSection } from "./BrowserSettingsSection";
import { SharedWithOthersSection } from "./SharedWithOthersSection";
import { StatusSection } from "./StatusSection";
import {
  SharingPopoverReadError,
  useSharingPopoverQuery,
} from "./useSharingPopoverQuery";

/**
 * The content of the sharing popover in the top bar and in the bottom sheet
 * of the mobile action bar. The sections of the server data show after the
 * first read. The section of this browser shows at once, because it reads
 * only the browser.
 */
export const SharingPopoverContent = () => {
  const query = useSharingPopoverQuery();
  const { data } = query;

  return (
    <div className="flex flex-col gap-6">
      {query.isPending && (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <AsciiSpinner />
          Lade den Status …
        </p>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-col gap-2">
          <Note
            type="error"
            message={
              query.error instanceof SharingPopoverReadError
                ? query.error.message
                : "Der Status konnte nicht geladen werden."
            }
          />

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

      <BrowserSettingsSection />

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
