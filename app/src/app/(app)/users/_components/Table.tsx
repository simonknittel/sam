"use client";

import { type Entity, type User } from "@prisma/client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaExternalLinkAlt,
  FaSortAlphaDown,
  FaSortAlphaUpAlt,
} from "react-icons/fa";
import Avatar from "~/app/_components/Avatar";

interface Props {
  users: {
    user: User;
    discordId: string;
    entity?: Entity;
  }[];
}

type Row = {
  user: User;
  discordId: string;
  entity?: Entity;
};

const columnHelper = createColumnHelper<Row>();

const Table = ({ users }: Readonly<Props>) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "user_name", desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("discordId", {
        header: "Discord ID",
        cell: (props) => {
          return (
            <div className="flex gap-2 items-center">
              <Avatar
                name={props.getValue()}
                image={props.row.original.user.image}
                size={32}
                className="grow-1 shrink-0"
              />

              {props.getValue()}
            </div>
          );
        },
      }),
      columnHelper.accessor("user.id", {
        header: "Login ID",
        cell: (props) => props.getValue(),
      }),
      columnHelper.accessor("user.name", {
        header: "Handle",
        cell: (props) =>
          props.getValue() || (
            <span className="italic text-neutral-500">Unbekannt</span>
          ),
      }),
      columnHelper.accessor("entity.id", {
        header: "",
        cell: (props) => {
          const entityId = props.getValue();
          if (!entityId) return null;

          return (
            <Link
              href={`/spynet/entity/${entityId}`}
              className="text-sinister-red-500 hover:text-sinister-red-300 flex gap-2 items-center"
            >
              <span className="hidden sm:inline">Spynet</span>{" "}
              <FaExternalLinkAlt />
            </Link>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className="w-full">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr
            key={headerGroup.id}
            className="grid grid-cols-[1fr_1fr_1fr_24px] sm:grid-cols-[1fr_1fr_1fr_128px] items-center gap-4"
          >
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="text-left text-neutral-400">
                {header.isPlaceholder ? null : (
                  <div
                    {...{
                      className: header.column.getCanSort()
                        ? "cursor-pointer select-none flex items-center gap-2 hover:text-neutral-50"
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
            className="grid grid-cols-[1fr_1fr_1fr_24px] sm:grid-cols-[1fr_1fr_1fr_128px] items-center gap-4 px-2 h-14 rounded -mx-2 first:mt-2"
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="overflow-hidden text-ellipsis">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
