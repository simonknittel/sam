"use client";

import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Upload,
  type Variant,
  type VariantTag,
} from "@prisma/client";
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
import {
  FaRegCheckCircle,
  FaSortAlphaDown,
  FaSortAlphaUpAlt,
} from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

interface Props {
  readonly className?: string;
  readonly fleet: {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer & {
          image: Upload | null;
        };
      };
      tags: VariantTag[];
    };
    count: number;
  }[];
}

type Row = Props["fleet"][number];

const columnHelper = createColumnHelper<Row>();

const GRID_COLS = "grid-cols-[256px_1fr_56px_56px]";

export const FleetTable = ({ className, fleet }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "variant", desc: false },
  ]);

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("variant.name", {
        header: "Schiff",
        id: "variant",
        cell: (row) => {
          const manufacturer = row.row.original.variant.series.manufacturer;

          return (
            <VariantWithLogo
              variant={row.row.original.variant}
              manufacturer={manufacturer}
            />
          );
        },
      }),
      columnHelper.accessor("variant.tags", {
        header: "Tags",
        cell: (row) => {
          return (
            <div className="overflow-hidden flex flex-wrap gap-1">
              {row.row.original.variant.tags
                .toSorted((a, b) => a.key.localeCompare(b.key))
                .map((tag) => (
                  <VariantTagBadge key={tag.id} tag={tag} />
                ))}
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor("variant.status", {
        header: "Status",
        cell: (row) => {
          if (row.getValue() === VariantStatus.FLIGHT_READY)
            return <FaRegCheckCircle title="Flight ready" />;
          if (row.getValue() === VariantStatus.NOT_FLIGHT_READY)
            return (
              <FaRegCircleXmark
                title="Nicht flight ready"
                className="text-brand-red-500"
              />
            );
          return null;
        },
      }),
      columnHelper.accessor("count", {
        header: "Anzahl",
        cell: (row) => row.getValue(),
      }),
    ];
  }, []);

  const table = useReactTable({
    data: fleet,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className={clsx("w-full min-w-[560px]", className)}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr
            key={headerGroup.id}
            className={clsx("grid items-center gap-4", GRID_COLS)}
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
              "grid items-center gap-4 px-2 py-1 rounded-secondary -mx-2 first:mt-2",
              GRID_COLS,
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
  );
};
