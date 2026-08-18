import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import type { ReactNode } from "react";
import { ActivityColumn, type ActivityEntry } from "../utils/activityEntry";
import { ActivityRow } from "./ActivityRow";

const DATE_COLUMN: TableColumn = {
  key: "date",
  label: "Datum",
  track: "150px",
  minWidth: 150,
};

const ACTOR_COLUMN: TableColumn = {
  key: ActivityColumn.Actor,
  label: "Akteur",
  track: "180px",
  minWidth: 180,
};

const MESSAGE_COLUMN: TableColumn = {
  key: "message",
  label: "Aktivität",
  track: "minmax(280px,1fr)",
  minWidth: 280,
};

const CONFIRMATION_COLUMN: TableColumn = {
  key: ActivityColumn.Confirmation,
  label: "Status",
  track: "220px",
  minWidth: 220,
};

interface Props {
  readonly className?: string;
  readonly heading?: ReactNode;
  readonly entries: readonly ActivityEntry[];
  /** Which optional columns this context shows, in any order. */
  readonly columns: readonly ActivityColumn[];
  /** Header of the target column, e.g. "Betroffen" or "Citizen". */
  readonly targetLabel?: string;
  readonly emptyMessage: string;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

/**
 * The one table every activity and history surface renders through. Which
 * columns a context adds is all that varies.
 */
export const ActivityTable = ({
  className,
  heading,
  entries,
  columns,
  targetLabel = "Betroffen",
  emptyMessage,
  nextCursor,
  prevCursor,
}: Props) => {
  const tableColumns: TableColumn[] = [
    DATE_COLUMN,
    ...(columns.includes(ActivityColumn.Actor) ? [ACTOR_COLUMN] : []),
    ...(columns.includes(ActivityColumn.Target)
      ? [
          {
            key: ActivityColumn.Target,
            label: targetLabel,
            track: "220px",
            minWidth: 220,
          },
        ]
      : []),
    MESSAGE_COLUMN,
    ...(columns.includes(ActivityColumn.Confirmation)
      ? [CONFIRMATION_COLUMN]
      : []),
  ];

  return (
    <TableTile
      className={className}
      heading={heading}
      columns={tableColumns}
      isEmpty={entries.length === 0}
      emptyMessage={emptyMessage}
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={nextCursor}
          prevCursor={prevCursor}
        />
      }
    >
      {entries.map((entry) => (
        <ActivityRow
          key={`${entry.sourceKey}:${entry.id}`}
          entry={entry}
          columns={columns}
        />
      ))}
    </TableTile>
  );
};
