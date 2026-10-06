"use client";

import { SortableTable } from "@/modules/common/components/SortableTable";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo } from "react";

interface Row {
  role: BadgeRole;
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

export const RolesTable = ({ className, rows }: Props) => {
  const columns = useMemo(() => {
    return [
      columnHelper.accessor("role.name", {
        header: "Rolle",
        id: "name",
        cell: (row) => {
          const { role } = row.row.original;
          return <SingleRoleBadge roleId={role.id} className="inline-flex" />;
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
      cellClassName="p-px"
    />
  );
};
