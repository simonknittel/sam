"use client";

import type { Entity } from "@prisma/client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FaSortAlphaDown, FaSortAlphaUpAlt } from "react-icons/fa";

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
      <table className={clsx("w-full", TABLE_MIN_WIDTH)}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className={clsx("grid items-center gap-4 pb-2", GRID_COLS)}
            >
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="text-left text-neutral-500 p-0">
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort()
                          ? "cursor-pointer select-none flex items-center gap-2 hover:text-neutral-300"
                          : "",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: <FaSortAlphaDown />,
                        desc: <FaSortAlphaUpAlt />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={clsx(
                "grid items-center gap-4 border-t border-white/5 py-1",
                GRID_COLS,
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="overflow-hidden h-full">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
