import { Table, TBody, THead } from "@/modules/common/components/Table";
import clsx from "clsx";
import { useMemo } from "react";
import { Entry } from "./Entry";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const COLUMNS = "120px 140px 100px 200px 1fr";

interface Props {
  readonly className?: string;
}

export const LogAnalyzerTable = ({ className }: Props) => {
  const { entryFilterFn, entries } = useLogAnalyzerContext();

  /** The filter runs first, so the sort works on the smaller list */
  const sortedFilteredEntries = useMemo(
    () =>
      Array.from(entries.values())
        .filter(entryFilterFn)
        .toSorted(
          (first, second) => second.isoDate.getTime() - first.isoDate.getTime(),
        ),
    [entries, entryFilterFn],
  );

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

        <TBody className="text-sm">
          {sortedFilteredEntries.map((entry) => (
            <Entry key={entry.key} entry={entry} />
          ))}
        </TBody>
      </Table>
    </div>
  );
};
