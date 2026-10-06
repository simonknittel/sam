"use client";

import { Link } from "@/modules/common/components/Link";
import { SortableTable } from "@/modules/common/components/SortableTable";
import type { Citizen } from "@sam-monorepo/database/browser";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import clsx from "clsx";

type Row = Pick<Citizen, "id" | "handle" | "silcBalance" | "totalEarnedSilc">;

const columnHelper = createColumnHelper<Row>();

const COLUMNS = [
  columnHelper.accessor("handle", {
    header: "Citizen",
    id: "handle",
    cell: (row) => {
      const { id, handle } = row.row.original;
      return (
        <Link
          href={`/app/spynet/citizen/${id}/silc`}
          className="flex h-8 items-center overflow-hidden rounded-secondary px-2 text-ellipsis text-brand-red-500 hover:bg-neutral-800"
          prefetch={false}
          title={handle || id}
        >
          {handle || id}
        </Link>
      );
    },
  }),

  columnHelper.accessor("silcBalance", {
    header: "Kontostand",
    id: "silcBalance",
    sortDescFirst: true,
    cell: (row) => (
      <span
        className={clsx("flex h-8 items-center font-bold", {
          "text-green-500": row.getValue() > 0,
          "text-red-500": row.getValue() < 0,
        })}
      >
        {row.getValue()}
      </span>
    ),
  }),

  columnHelper.accessor("totalEarnedSilc", {
    header: "Verdient",
    id: "totalEarnedSilc",
    sortDescFirst: true,
    cell: (row) => (
      <span className="flex h-8 items-center font-bold">{row.getValue()}</span>
    ),
  }),
];

const TABLE_MIN_WIDTH = "min-w-80";
const GRID_COLS = "grid-cols-[160px_96px_96px]";
const INITIAL_SORTING: SortingState = [
  { id: "silcBalance", desc: true },
  { id: "handle", desc: false },
];

interface Props {
  readonly className?: string;
  readonly rows: Row[];
}

export const SilcBalancesTableClient = ({ className, rows }: Props) => {
  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <SortableTable
        data={rows}
        columns={COLUMNS}
        initialSorting={INITIAL_SORTING}
        className={TABLE_MIN_WIDTH}
        gridColsClassName={GRID_COLS}
        rowClassName="border-t border-white/5 py-1"
        cellClassName="h-full"
      />
    </div>
  );
};
