import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Table, TBody, THead } from "@/modules/common/components/Table";
import clsx from "clsx";
import { useState } from "react";
import { collapseRepeatedEntries } from "../utils/collapseRepeatedEntries";
import { compareEntriesNewestFirst } from "../utils/compareEntries";
import { Entry } from "./Entry";
import { EntryClock } from "./EntryClock";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const COLUMNS = "120px 140px 100px 200px 1fr";

const ROWS_PER_PAGE = 200;

interface Props {
  readonly className?: string;
}

export const LogAnalyzerTable = ({ className }: Props) => {
  const { entryWindowFilterFn, tableEntryFilterFn, entries } =
    useLogAnalyzerContext();
  const [visibleRowCount, setVisibleRowCount] = useState(ROWS_PER_PAGE);

  /**
   * The repeats collapse before the filters of the types: a hidden type, for
   * example the end of a session, still ends a repeat
   */
  const sortedFilteredEntries = collapseRepeatedEntries(
    Array.from(entries.values())
      .filter(entryWindowFilterFn)
      .toSorted(compareEntriesNewestFirst),
  ).filter(tableEntryFilterFn);

  const visibleEntries = sortedFilteredEntries.slice(0, visibleRowCount);
  const hiddenRowCount = sortedFilteredEntries.length - visibleEntries.length;

  return (
    <div className={clsx("rounded-primary bg-secondary p-4", className)}>
      <Table columns={COLUMNS} minWidth={950}>
        <THead>
          <th>Datum</th>
          <th>Reporter</th>
          <th>Status</th>
          <th>Typ</th>
          <th>Nachricht</th>
        </THead>

        <EntryClock>
          <TBody className="text-sm">
            {visibleEntries.map((entry) => (
              <Entry key={entry.key} entry={entry} />
            ))}
          </TBody>
        </EntryClock>
      </Table>

      {visibleEntries.length <= 0 && (
        <p className="mt-4 text-center text-sm text-white/60">
          Keine Einträge für diesen Zeitraum und diese Filter.
        </p>
      )}

      {hiddenRowCount > 0 && (
        <div className="mt-4 flex justify-center">
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() =>
              setVisibleRowCount((rowCount) => rowCount + ROWS_PER_PAGE)
            }
          >
            {Math.min(hiddenRowCount, ROWS_PER_PAGE)} weitere anzeigen
          </Button2>
        </div>
      )}
    </div>
  );
};
