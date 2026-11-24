import { Link } from "@/modules/common/components/Link";
import type { ReactNode } from "react";
import { FaSortDown, FaSortUp } from "react-icons/fa";

/** The values are the values of the `aria-sort` attribute */
export enum SortDirection {
  Ascending = "ascending",
  Descending = "descending",
}

interface SortIcons {
  readonly ascending: ReactNode;
  readonly descending: ReactNode;
}

const ARROW_ICONS: SortIcons = {
  ascending: <FaSortUp />,
  descending: <FaSortDown />,
};

export interface SortableColumnHeaderProps<Sort extends string> {
  readonly className?: string;
  readonly children: ReactNode;
  readonly sort: Sort;
  readonly ascending: Sort;
  readonly descending: Sort;
  /** The direction of the first click when the table has a different sort */
  readonly firstDirection: SortDirection;
  /** The link to the table with the given sort and its other search parameters */
  readonly getHref: (searchParams: { readonly sort: Sort }) => string;
  readonly icons?: SortIcons;
  readonly addition?: ReactNode;
}

export const SortableColumnHeader = <Sort extends string>({
  className,
  children,
  sort,
  ascending,
  descending,
  firstDirection,
  getHref,
  icons = ARROW_ICONS,
  addition,
}: SortableColumnHeaderProps<Sort>) => {
  const [firstSort, secondSort] =
    firstDirection === SortDirection.Ascending
      ? [ascending, descending]
      : [descending, ascending];

  let direction: SortDirection | undefined;
  if (sort === ascending) direction = SortDirection.Ascending;
  if (sort === descending) direction = SortDirection.Descending;

  return (
    <th className={className} aria-sort={direction}>
      <Link
        href={getHref({ sort: sort === firstSort ? secondSort : firstSort })}
        className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
      >
        {children}
        {direction === SortDirection.Ascending && icons.ascending}
        {direction === SortDirection.Descending && icons.descending}
      </Link>

      {addition}
    </th>
  );
};
