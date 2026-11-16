"use client";

import {
  AlertDialog,
  useSubmitConfirmation,
} from "@/modules/common/components/AlertDialog";
import { Button2Variant } from "@/modules/common/components/Button2";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import toast from "react-hot-toast";
import { FaCloudArrowUp } from "react-icons/fa6";
import { PATTERNS } from "../utils/PATTERNS";
import type { PendingEntry } from "../utils/shareEntries";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const formatOlderEntryCount = (count: number) =>
  count === 1
    ? "1 älteren Eintrag"
    : `${count.toLocaleString("de")} ältere Einträge`;

const formatSharedEntryCount = (count: number) =>
  count === 1
    ? "1 Eintrag geteilt."
    : `${count.toLocaleString("de")} Einträge geteilt.`;

interface Props {
  readonly entries: readonly PendingEntry[];
  /** Returns false when a request failed. The request shows the error. */
  readonly onShare: () => Promise<boolean>;
}

/**
 * Shares the own entries of the date range which are older than the rolling
 * window, after a confirmation. A shared entry cannot be withdrawn. The count
 * goes down while the requests go out.
 */
export const ShareOlderEntriesButton = ({ entries, onShare }: Props) => {
  const { daysToLoad } = useLogAnalyzerContext();
  const confirmation = useSubmitConfirmation();

  if (entries.length <= 0) return null;

  /** The versions of a type share their title, thus they count together */
  const countsByTitle = new Map<string, number>();
  for (const { type } of entries) {
    const { title } = PATTERNS[type];
    countsByTitle.set(title, (countsByTitle.get(title) ?? 0) + 1);
  }

  const typeCounts = Array.from(countsByTitle, ([title, count]) => ({
    title,
    count,
  })).toSorted((first, second) => first.title.localeCompare(second.title));

  const share = async () => {
    const count = entries.length;
    if (await onShare()) toast.success(formatSharedEntryCount(count));
  };

  return (
    <form action={share} onSubmit={confirmation.onSubmit}>
      <AlertDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        title="Ältere Einträge teilen?"
        description={
          <>
            Du teilst {formatOlderEntryCount(entries.length)} aus dem Zeitraum
            mit den anderen Citizens. Die Einträge der letzten {daysToLoad} Tage
            teilt der Log Analyzer automatisch. Geteilte Einträge kannst du
            nicht zurücknehmen.
          </>
        }
        confirmLabel="Teilen"
      >
        <ul className="text-sm text-white/60">
          {typeCounts.map(({ title, count }) => (
            <li key={title} className="flex justify-between gap-4">
              <span>{title}</span>
              <span>{count.toLocaleString("de")}</span>
            </li>
          ))}
        </ul>
      </AlertDialog>

      <SubmitButton
        variant={Button2Variant.Secondary}
        icon={<FaCloudArrowUp />}
      >
        {formatOlderEntryCount(entries.length)} teilen
      </SubmitButton>
    </form>
  );
};
