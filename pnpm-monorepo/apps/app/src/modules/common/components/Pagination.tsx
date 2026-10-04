import { Link } from "@/modules/common/components/Link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface Props {
  readonly totalPages: number;
  readonly currentPage: number;
  /** The link to a page, with the other search parameters of the table */
  readonly getHref: (searchParams: { readonly page: number }) => string;
}

const Pagination = ({ totalPages, currentPage, getHref }: Props) => {
  return (
    <div className="flex h-11">
      {currentPage > 1 ? (
        <Link
          href={getHref({ page: currentPage - 1 })}
          aria-label="Vorherige Seite"
          className="flex w-11 items-center justify-center rounded-l border border-brand-red-500 text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300 focus-visible:border-brand-red-300 focus-visible:text-brand-red-300 active:border-brand-red-700 active:text-brand-red-700"
        >
          <FaChevronLeft />
        </Link>
      ) : (
        <span className="flex w-11 items-center justify-center rounded-l border border-neutral-500 text-neutral-500">
          <FaChevronLeft />
        </span>
      )}

      <span className="flex w-20 items-center justify-center border-y border-neutral-500">
        {currentPage} / {totalPages}
      </span>

      {currentPage + 1 <= totalPages ? (
        <Link
          href={getHref({ page: currentPage + 1 })}
          aria-label="Nächste Seite"
          className="flex w-11 items-center justify-center rounded-r border border-brand-red-500 text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300 focus-visible:border-brand-red-300 focus-visible:text-brand-red-300 active:border-brand-red-700 active:text-brand-red-700"
        >
          <FaChevronRight />
        </Link>
      ) : (
        <span className="flex w-11 items-center justify-center rounded-r border border-neutral-500 text-neutral-500">
          <FaChevronRight />
        </span>
      )}
    </div>
  );
};

export default Pagination;
