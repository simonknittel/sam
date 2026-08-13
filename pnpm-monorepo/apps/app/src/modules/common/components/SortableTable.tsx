"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import clsx from "clsx";
import { FaSortAlphaDown, FaSortAlphaUpAlt } from "react-icons/fa";

interface Props<Row> {
  readonly className?: string;
  readonly table: Table<Row>;
  /** The shared grid template of the header and body rows */
  readonly gridColsClassName: string;
  readonly rowClassName?: string;
  readonly cellClassName?: string;
}

/**
 * The render shell shared by the TanStack tables: a CSS-grid table whose
 * headers toggle client-side sorting. Column definitions, sorting state and
 * the `useReactTable` call stay with the caller.
 */
export const SortableTable = <Row,>({
  className,
  table,
  gridColsClassName,
  rowClassName,
  cellClassName,
}: Props<Row>) => {
  return (
    <table className={clsx("w-full", className)}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr
            key={headerGroup.id}
            className={clsx("grid items-center gap-4 pb-2", gridColsClassName)}
          >
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="text-left text-neutral-500 p-0">
                {header.isPlaceholder ? null : (
                  <div
                    className={
                      header.column.getCanSort()
                        ? "cursor-pointer select-none flex items-center gap-2 hover:text-neutral-300"
                        : ""
                    }
                    onClick={header.column.getToggleSortingHandler()}
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
              "grid items-center gap-4",
              gridColsClassName,
              rowClassName,
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={clsx("overflow-hidden", cellClassName)}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
