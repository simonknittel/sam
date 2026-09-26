import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Table, TBody, THead } from "@/modules/common/components/Table";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { collapseRepeatedEntries } from "../utils/collapseRepeatedEntries";
import { Entry } from "./Entry";
import { EntryClock } from "./EntryClock";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const COLUMNS = "120px 140px 100px 200px 1fr";

/** The rows the table shows first, and the rows each click on "more" adds */
const ROWS_PER_PAGE = 200;

interface Props {
  readonly className?: string;
}

export const LogAnalyzerTable = ({ className }: Props) => {
  const { entryFilterFn, entries } = useLogAnalyzerContext();
  const [visibleRowCount, setVisibleRowCount] = useState(ROWS_PER_PAGE);

  /** The filter runs first, so the sort works on the smaller list */
  const sortedFilteredEntries = useMemo(
    () =>
      collapseRepeatedEntries(
        Array.from(entries.values())
          .filter(entryFilterFn)
          .toSorted(
            (first, second) =>
              second.isoDate.getTime() - first.isoDate.getTime(),
          ),
      ),
    [entries, entryFilterFn],
  );

  const visibleEntries = sortedFilteredEntries.slice(0, visibleRowCount);
  const hiddenRowCount = sortedFilteredEntries.length - visibleEntries.length;

  return (
    <div className={clsx("p-4 bg-secondary rounded-primary", className)}>
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

      {hiddenRowCount > 0 && (
        <div className="flex justify-center mt-4">
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
