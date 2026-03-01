"use client";

import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { Link } from "@/modules/common/components/Link";
import type { Entity, PenaltyEntry as PenaltyEntryType } from "@prisma/client";
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
import { PenaltyEntry } from "./PenaltyEntry";

interface Row {
  citizen: Entity;
  totalPoints: number;
  entries: (PenaltyEntryType & {
    createdBy: Entity;
  })[];
}

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[640px]";
const GRID_COLS = "grid-cols-[160px_88px_1fr]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showDelete?: boolean;
}

export const AllEntriesTableClient = ({
  className,
  rows,
  showDelete,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("citizen.handle", {
        header: "Citizen",
        id: "name",
        cell: (row) => {
          const { citizen } = row.row.original;
          return (
            <CitizenPopover citizenId={citizen.id}>
              <Link
                href={`/app/spynet/citizen/${citizen.id}/penalty-points`}
                className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-10 text-brand-red-500 overflow-hidden text-ellipsis"
                prefetch={false}
                title={citizen.handle || ""}
              >
                {citizen.handle}
              </Link>
            </CitizenPopover>
          );
        },
      }),

      columnHelper.accessor("totalPoints", {
        header: "Gesamt",
        id: "totalPoints",
        sortDescFirst: true,
        cell: (row) => (
          <span className="flex items-center h-10 font-bold">
            {row.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor("entries", {
        header: "Einträge",
        id: "entries",
        enableSorting: false,
        cell: (row) => {
          const { entries } = row.row.original;
          return (
            <div className="flex flex-col gap-4 py-3">
              {entries
                .toSorted(
                  (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
                )
                .map((entry) => (
                  <PenaltyEntry
                    key={entry.id}
                    entry={entry}
                    showDelete={showDelete}
                  />
                ))}
            </div>
          );
        },
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
