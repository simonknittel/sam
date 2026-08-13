"use client";

import { Link } from "@/modules/common/components/Link";
import { SortableTable } from "@/modules/common/components/SortableTable";
import type { Entity } from "@sam-monorepo/database/browser";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo, useState } from "react";

type Row = Pick<Entity, "id" | "handle" | "silcBalance" | "totalEarnedSilc">;

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[320px]";
const GRID_COLS = "grid-cols-[160px_96px_96px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
}

export const SilcBalancesTableClient = ({ className, rows }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "silcBalance", desc: true },
    { id: "handle", desc: false },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("handle", {
        header: "Citizen",
        id: "handle",
        cell: (row) => {
          const { id, handle } = row.row.original;
          return (
            <Link
              href={`/app/spynet/citizen/${id}/silc`}
              className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-8 text-brand-red-500 overflow-hidden text-ellipsis"
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
            className={clsx("flex items-center h-8 font-bold", {
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
          <span className="flex items-center h-8 font-bold">
            {row.getValue()}
          </span>
        ),
      }),
    ];
  }, []);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's API is not React-Compiler-safe; the component simply opts out of compilation.
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <SortableTable
        table={table}
        className={TABLE_MIN_WIDTH}
        gridColsClassName={GRID_COLS}
        rowClassName="border-t border-white/5 py-1"
        cellClassName="h-full"
      />
    </div>
  );
};
