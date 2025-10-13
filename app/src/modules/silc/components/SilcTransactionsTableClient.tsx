"use client";

import { formatDate } from "@/modules/common/utils/formatDate";
import type { Entity, SilcTransaction } from "@prisma/client";
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
import { CreateOrUpdateSilcTransaction } from "./CreateOrUpdateSilcTransaction";
import { DeleteSilcTransaction } from "./DeleteSilcTransaction";

type Row = SilcTransaction & {
  receiver: Pick<Entity, "id" | "handle">;
  createdBy: Pick<Entity, "id" | "handle"> | null;
  updatedBy: Pick<Entity, "id" | "handle"> | null;
};

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[640px]";
const GRID_COLS = "grid-cols-[128px_160px_88px_1fr_160px_64px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showEdit?: boolean;
  readonly showDelete?: boolean;
}

export const SilcTransactionsTableClient = ({
  className,
  rows,
  showEdit,
  showDelete,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("createdAt", {
        header: "Datum",
        id: "createdAt",
        cell: (row) => (
          <span className="flex items-center h-8 whitespace-nowrap">
            {formatDate(row.getValue())}
          </span>
        ),
      }),

      columnHelper.accessor("receiver", {
        header: "Empfänger",
        id: "receiver",
        enableSorting: false,
        cell: (row) => {
          const { receiver } = row.row.original;
          return (
            <Link
              href={`/app/spynet/citizen/${receiver.id}/silc`}
              className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-full text-brand-red-500 overflow-hidden whitespace-nowrap text-ellipsis"
              prefetch={false}
              title={receiver.handle || receiver.id}
            >
              {receiver.handle || receiver.id}
            </Link>
          );
        },
      }),

      columnHelper.accessor("value", {
        header: "Wert",
        id: "value",
        enableSorting: false,
        cell: (row) => (
          <span
            className={clsx("font-bold", {
              "text-green-500": row.getValue() > 0,
              "text-red-500": row.getValue() < 0,
            })}
          >
            {row.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor("description", {
        header: "Beschreibung",
        id: "description",
        enableSorting: false,
        cell: (row) => (
          <span
            title={row.getValue() || undefined}
            className="overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {row.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor("id", {
        header: "Von",
        id: "createdOrUpdatedBy",
        enableSorting: false,
        cell: (row) => {
          const { createdBy, updatedBy } = row.row.original;
          const citizen = updatedBy || createdBy;
          if (!citizen) return null;
          return (
            <Link
              href={`/app/spynet/citizen/${citizen.id}`}
              className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-full text-brand-red-500 overflow-hidden whitespace-nowrap text-ellipsis"
              prefetch={false}
              title={citizen.handle || citizen.id}
            >
              {citizen.handle || citizen.id}
            </Link>
          );
        },
      }),

      columnHelper.accessor("id", {
        header: "",
        id: "actions",
        enableSorting: false,
        cell: (row) => {
          const transaction = row.row.original;

          return (
            <span className="flex items-center gap-1 h-full">
              {showEdit && (
                <CreateOrUpdateSilcTransaction
                  transaction={transaction}
                  className="flex-none"
                />
              )}
              {showDelete && (
                <DeleteSilcTransaction
                  id={row.getValue()}
                  className="flex-none"
                />
              )}
            </span>
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
                <td
                  key={cell.id}
                  className="overflow-hidden flex items-center h-8"
                >
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
