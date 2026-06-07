import { Table, TBody, THead } from "@/modules/common/components/Table";
import clsx from "clsx";
import type { IEntry } from "../utils/PATTERNS";
import { Entry } from "./Entry";

export const GRID_COLS = "grid-cols-[160px_160px_1fr]";
const TABLE_MIN_WIDTH = "min-w-160";

interface Props {
  readonly className?: string;
  readonly entries: ReadonlyMap<string, IEntry>;
  readonly entryFilterFn: (entry: IEntry) => boolean;
}

export const LogAnalyzerTable = ({
  className,
  entries,
  entryFilterFn,
}: Props) => {
  const sortedFilteredEntries = Array.from(entries.values())
    .toSorted((a, b) => b.isoDate.getTime() - a.isoDate.getTime())
    .filter(entryFilterFn);

  return (
    <div className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table tableClassName={TABLE_MIN_WIDTH}>
        <THead className={GRID_COLS}>
          <th>Datum</th>
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
