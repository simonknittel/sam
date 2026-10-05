"use client";

import {
  citizenTableParsers,
  serializeCitizenTableSearchParams,
  type CitizenTableSort,
} from "@/modules/citizen/utils/citizenTableSearchParams";
import Pagination from "@/modules/common/components/Pagination";
import {
  SortableColumnHeader,
  type SortableColumnHeaderProps,
} from "@/modules/common/components/SortableColumnHeader";
import { useTableLinks } from "@/modules/common/utils/useTableLinks";

interface PaginationProps {
  readonly totalPages: number;
}

/** The page links of the citizen table */
export const CitizenTablePagination = ({ totalPages }: PaginationProps) => {
  const { searchParameters, getHref } = useTableLinks(
    citizenTableParsers,
    serializeCitizenTableSearchParams,
  );

  return (
    <Pagination
      totalPages={totalPages}
      currentPage={searchParameters.page}
      getHref={getHref}
    />
  );
};

/** The header cell of a column that sorts the citizen table */
export const CitizenTableSortableColumnHeader = (
  props: Omit<SortableColumnHeaderProps<CitizenTableSort>, "sort" | "getHref">,
) => {
  const { searchParameters, getHref } = useTableLinks(
    citizenTableParsers,
    serializeCitizenTableSearchParams,
  );

  return (
    <SortableColumnHeader
      {...props}
      sort={searchParameters.sort}
      getHref={getHref}
    />
  );
};
