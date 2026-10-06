"use client";

import { SortableTable } from "@/modules/common/components/SortableTable";
import { VariantTagBadge } from "@/modules/fleet/components/VariantTagBadge";
import type { VariantTagBadgeItem } from "@/modules/fleet/queries/shipQuery";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo } from "react";

interface Row {
  tag: VariantTagBadgeItem;
  count: number;
}

const columnHelper = createColumnHelper<Row>();

const TABLE_MIN_WIDTH = "min-w-80";
const GRID_COLS = "grid-cols-[256px_56px]";
const INITIAL_SORTING: SortingState = [{ id: "name", desc: false }];

interface Props {
  readonly className?: string;
  readonly rows: Row[];
}

export const VariantTagsTable = ({ className, rows }: Props) => {
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

  return (
    <SortableTable
      data={rows}
      columns={columns}
      initialSorting={INITIAL_SORTING}
      className={clsx(TABLE_MIN_WIDTH, className)}
      gridColsClassName={GRID_COLS}
    />
  );
};
