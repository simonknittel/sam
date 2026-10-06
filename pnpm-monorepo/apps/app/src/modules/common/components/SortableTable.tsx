"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Header,
  type SortingState,
  type TableOptions,
} from "@tanstack/react-table";
import clsx from "clsx";
import { FaSortAlphaDown, FaSortAlphaUpAlt } from "react-icons/fa";
import { SortDirection } from "./SortableColumnHeader";

interface Props<Row> {
  readonly className?: string;
  readonly data: TableOptions<Row>["data"];
  readonly columns: TableOptions<Row>["columns"];
  /** Applies only when the table mounts. A click on a header changes it. */
  readonly initialSorting: SortingState;
  /** The shared grid template of the header and body rows */
  readonly gridColsClassName: string;
  readonly rowClassName?: string;
  readonly cellClassName?: string;
}

/**
 * The `aria-sort` value of a header. Only one header can have the attribute,
 * thus a table sorted by more than one column gives it to the first column of
 * the sort.
 */
const getAriaSort = <Row,>(header: Header<Row, unknown>) => {
  if (header.isPlaceholder || header.column.getSortIndex() !== 0)
    return undefined;

  const direction = header.column.getIsSorted();
  switch (direction) {
    case "asc":
      return SortDirection.Ascending;

    case "desc":
      return SortDirection.Descending;

    case false:
      return undefined;

    default:
      throw new Error(`Unknown sort direction: ${direction satisfies never}`);
  }
};

/**
 * A CSS-grid table whose headers toggle client-side sorting. The callers give
 * the rows and the column definitions.
 */
export const SortableTable = <Row,>({
  className,
  data,
  columns,
  initialSorting,
  gridColsClassName,
  rowClassName,
  cellClassName,
}: Props<Row>) => {
  /**
   * `useReactTable` returns the same object on each render, and TanStack
   * changes this object in place. Thus the React Compiler must not memoize
   * the values that this component reads from the table. The compiler skips
   * each component that calls `useReactTable`. Keep this call and the reads
   * of the table in the same component.
   */
  // eslint-disable-next-line react-hooks/incompatible-library -- see the comment above
  const table = useReactTable({
    data,
    columns,
    initialState: { sorting: initialSorting },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className={clsx("w-full", className)}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr
            key={headerGroup.id}
            className={clsx("grid items-center gap-4 pb-2", gridColsClassName)}
          >
            {headerGroup.headers.map((header) => {
              const label = header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );
              const canSort =
                !header.isPlaceholder && header.column.getCanSort();
              const direction = header.column.getIsSorted();

              return (
                <th
                  key={header.id}
                  className="p-0 text-left text-neutral-500"
                  aria-sort={getAriaSort(header)}
                >
                  {canSort ? (
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {label}
                      {direction === "asc" && <FaSortAlphaDown />}
                      {direction === "desc" && <FaSortAlphaUpAlt />}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
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
