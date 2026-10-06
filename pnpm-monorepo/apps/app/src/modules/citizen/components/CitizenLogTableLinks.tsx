"use client";

import {
  citizenLogTableParsers,
  serializeCitizenLogTableSearchParams,
  type CitizenLogTableSort,
} from "@/modules/citizen/utils/citizenLogTableSearchParams";
import Pagination from "@/modules/common/components/Pagination";
import {
  SortableColumnHeader,
  type SortableColumnHeaderProps,
} from "@/modules/common/components/SortableColumnHeader";
import { useTableLinks } from "@/modules/common/utils/useTableLinks";

interface PaginationProps {
  readonly totalPages: number;
}

/** The page links of the Spynet log tables (notes and other) */
export const CitizenLogTablePagination = ({ totalPages }: PaginationProps) => {
  const { searchParameters, getHref } = useTableLinks(
    citizenLogTableParsers,
    serializeCitizenLogTableSearchParams,
  );

  return (
    <Pagination
      totalPages={totalPages}
      currentPage={searchParameters.page}
      getHref={getHref}
    />
  );
};

/** The header cell of a column that sorts a Spynet log table */
export const CitizenLogTableSortableColumnHeader = (
  props: Omit<
    SortableColumnHeaderProps<CitizenLogTableSort>,
    "sort" | "getHref"
  >,
) => {
  const { searchParameters, getHref } = useTableLinks(
    citizenLogTableParsers,
    serializeCitizenLogTableSearchParams,
  );

  return (
    <SortableColumnHeader
      {...props}
      sort={searchParameters.sort}
      getHref={getHref}
    />
  );
};
