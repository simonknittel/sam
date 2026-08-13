"use client";

import { SortableTable } from "@/modules/common/components/SortableTable";
import { VariantTagBadge } from "@/modules/fleet/components/VariantTagBadge";
import type { VariantTag } from "@sam-monorepo/database/browser";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo, useState } from "react";

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

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's API is not React-Compiler-safe; the component simply opts out of compilation.
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
    <SortableTable
      table={table}
      className={clsx(TABLE_MIN_WIDTH, className)}
      gridColsClassName={GRID_COLS}
    />
  );
};
