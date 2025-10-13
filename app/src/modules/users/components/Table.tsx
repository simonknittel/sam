"use client";

import Avatar from "@/modules/common/components/Avatar";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import { VerifyEmailButton } from "@/modules/users/components/VerifyEmailButton";
import { type Entity, type User } from "@prisma/client";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  FaExternalLinkAlt,
  FaSortAlphaDown,
  FaSortAlphaUpAlt,
} from "react-icons/fa";

interface Props {
  readonly users: {
    readonly user: User;
    readonly discordId: string;
    readonly entity?: Entity;
  }[];
}

type Row = Readonly<{
  user: User;
  discordId: string;
  entity?: Entity;
}>;

const columnHelper = createColumnHelper<Row>();

export const Table = ({ users }: Props) => {
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

              <span
                title={props.getValue()}
                className="text-ellipsis overflow-hidden whitespace-nowrap"
              >
                {props.getValue()}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("user.id", {
        header: "User ID",
        cell: (props) => {
          return (
            <span
              title={props.getValue()}
              className="text-ellipsis block overflow-hidden whitespace-nowrap"
            >
              {props.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor("user.emailVerified", {
        header: "Datenschutzerklärung",
        cell: (props) => {
          if (!props.getValue())
            return <VerifyEmailButton userId={props.row.original.user.id} />;

          return (
            <span
              title={formatDate(props.getValue()) || undefined}
              className="text-ellipsis block overflow-hidden whitespace-nowrap"
            >
              {formatDate(props.getValue())}
            </span>
          );
        },
      }),
      columnHelper.accessor("user.name", {
        header: "Handle",
        cell: (props) => {
          if (!props.getValue())
            return <span className="italic text-neutral-500">-</span>;
          return (
            <span
              title={props.getValue() || undefined}
              className="block text-ellipsis overflow-hidden whitespace-nowrap"
            >
              {props.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor("entity", {
        header: "",
        cell: (props) => {
          const entityId = props.getValue()?.id;
          if (!entityId) return null;

          return (
            <Link
              href={`/app/spynet/citizen/${entityId}`}
              className="text-brand-red-500 hover:text-brand-red-300 flex gap-2 items-center"
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
            className="grid grid-cols-[1fr_1fr_minmax(80px,1fr)_1fr_24px] sm:grid-cols-[1fr_1fr_minmax(80px,1fr)_1fr_128px] items-center gap-4"
          >
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="text-left text-neutral-400 overflow-hidden"
              >
                {header.isPlaceholder ? null : (
                  <div
                    {...{
                      className: header.column.getCanSort()
                        ? "cursor-pointer select-none flex items-center gap-2 hover:text-neutral-50 overflow-hidden text-ellipsis whitespace-nowrap"
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
            className="grid grid-cols-[1fr_1fr_minmax(80px,1fr)_1fr_24px] sm:grid-cols-[1fr_1fr_minmax(80px,1fr)_1fr_128px] items-center gap-4 px-2 h-14 rounded-secondary -mx-2 first:mt-2"
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
