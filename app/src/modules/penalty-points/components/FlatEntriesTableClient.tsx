"use client";

import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { Entity, PenaltyEntry } from "@prisma/client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo } from "react";
import { DeletePenaltyEntry } from "./DeletePenaltyEntry";

type Row = PenaltyEntry & {
  citizen: Entity;
  createdBy: Entity;
};

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-[624px]";
const GRID_COLS_WITH_CITIZEN =
  "grid-cols-[140px_64px_140px_140px_140px_1fr_32px]";
const GRID_COLS_WITHOUT_CITIZEN = "grid-cols-[64px_140px_140px_140px_1fr_32px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showDelete?: boolean;
  readonly hideCitizenColumn?: boolean;
}

export const FlatEntriesTableClient = ({
  className,
  rows,
  showDelete,
  hideCitizenColumn,
}: Props) => {
  const columns = useMemo(() => {
    return [
      !hideCitizenColumn
        ? columnHelper.accessor("citizen", {
            header: "Citizen",
            id: "citizen",
            enableSorting: false,
            cell: (row) => {
              const citizen = row.getValue();
              return (
                <CitizenPopover citizenId={citizen.id}>
                  <Link
                    href={`/app/spynet/citizen/${citizen.id}/penalty-points`}
                    className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-8 text-brand-red-500 truncate"
                    prefetch={false}
                    title={citizen.handle || citizen.id}
                  >
                    {citizen.handle || citizen.id}
                  </Link>
                </CitizenPopover>
              );
            },
          })
        : null,

      columnHelper.accessor("points", {
        header: "Punkte",
        id: "points",
        enableSorting: false,
        cell: (row) => (
          <span className="flex items-center h-8 font-bold">
            {row.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor("createdAt", {
        header: "Erstellt",
        id: "createdAt",
        enableSorting: false,
        cell: (row) => (
          <span className="flex items-center h-8 whitespace-nowrap">
            {formatDate(row.getValue())}
          </span>
        ),
      }),

      columnHelper.accessor("createdBy", {
        header: "Von",
        id: "createdBy",
        enableSorting: false,
        cell: (row) => {
          const createdBy = row.getValue();
          return (
            <CitizenPopover citizenId={createdBy.id}>
              <Link
                href={`/app/spynet/citizen/${createdBy.id}`}
                className="hover:bg-neutral-800 flex items-center rounded-secondary px-2 h-8 text-brand-red-500 truncate"
                prefetch={false}
                title={createdBy.handle || createdBy.id}
              >
                {createdBy.handle || createdBy.id}
              </Link>
            </CitizenPopover>
          );
        },
      }),

      columnHelper.accessor("expiresAt", {
        header: "Verfällt",
        id: "expiresAt",
        enableSorting: false,
        cell: (row) => (
          <span className="flex items-center h-8 whitespace-nowrap">
            {row.getValue() ? formatDate(row.getValue()) : "-"}
          </span>
        ),
      }),

      columnHelper.accessor("reason", {
        header: "Begründung",
        id: "reason",
        enableSorting: false,
        cell: (row) => (
          <span
            className="block truncate"
            title={row.getValue() || "Keine Begründung"}
          >
            {row.getValue() || (
              <span className="italic text-neutral-500">Keine Begründung</span>
            )}
          </span>
        ),
      }),

      columnHelper.accessor("id", {
        header: "",
        id: "actions",
        enableSorting: false,
        cell: (row) => {
          const entry = row.row.original;
          return (
            <span className="flex items-center h-full">
              {showDelete &&
                !entry.deletedAt && <DeletePenaltyEntry entry={entry} />}
            </span>
          );
        },
      }),
    ].filter(Boolean) as ReturnType<typeof columnHelper.accessor>[];
  }, [hideCitizenColumn, showDelete]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={clsx("w-full overflow-x-auto", className)}>
      <table className={clsx("w-full", TABLE_MIN_WIDTH)}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className={clsx(
                "grid items-center gap-4 pb-2",
                hideCitizenColumn
                  ? GRID_COLS_WITHOUT_CITIZEN
                  : GRID_COLS_WITH_CITIZEN,
              )}
            >
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="text-left text-neutral-500 p-0">
                  {header.isPlaceholder ? null : (
                    <div>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
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
                hideCitizenColumn
                  ? GRID_COLS_WITHOUT_CITIZEN
                  : GRID_COLS_WITH_CITIZEN,
              )}
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
    </div>
  );
};
