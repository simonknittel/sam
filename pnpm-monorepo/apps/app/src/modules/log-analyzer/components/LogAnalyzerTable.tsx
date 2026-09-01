import { Table, TBody, THead } from "@/modules/common/components/Table";
import clsx from "clsx";
import { Entry } from "./Entry";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const COLUMNS = "160px 160px 160px 1fr";

interface Props {
  readonly className?: string;
}

export const LogAnalyzerTable = ({ className }: Props) => {
  const { entryFilterFn, entries } = useLogAnalyzerContext();

  const sortedFilteredEntries = Array.from(entries.values())
    .toSorted((a, b) => b.isoDate.getTime() - a.isoDate.getTime())
    .filter(entryFilterFn);

  return (
    <div className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table columns={COLUMNS} minWidth={800}>
        <THead>
          <th>Datum</th>
          <th>Typ</th>
          <th>Citizen</th>
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
