"use client";

import { VariantTagBadge } from "@/fleet/components/VariantTagBadge";
import type { VariantTag } from "@prisma/client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { FaSortAlphaDown, FaSortAlphaUpAlt } from "react-icons/fa";

interface Row {
  tag: VariantTag;
  count: number;
}

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[320px]";
const GRID_COLS = "grid-cols-[256px_56px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
}

export const VariantTagsTable = ({ className, rows }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("tag.value", {
        header: "Tag",
        id: "name",
        cell: (row) => {
          const { tag } = row.row.original;
          return <VariantTagBadge tag={tag} className="inline-flex" />;
        },
      }),
      columnHelper.accessor("count", {
        header: "Anzahl",
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
    <table className={clsx("w-full", TABLE_MIN_WIDTH, className)}>
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
            className={clsx("grid items-center gap-4", GRID_COLS)}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="overflow-hidden">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
