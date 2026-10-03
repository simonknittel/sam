import { Link } from "@/modules/common/components/Link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface Props {
  totalPages: number;
  currentPage: number;
  searchParams: URLSearchParams;
}

const Pagination = ({
  totalPages,
  currentPage,
  searchParams,
}: Readonly<Props>) => {
  const prevSearchParams = new URLSearchParams(searchParams);
  prevSearchParams.set("page", (currentPage - 1).toString());

  const nextSearchparams = new URLSearchParams(searchParams);
  nextSearchparams.set("page", (currentPage + 1).toString());

  return (
    <div className="flex h-11">
      {currentPage > 1 ? (
        <Link
          href={`?${prevSearchParams.toString()}`}
          className="flex w-11 items-center justify-center rounded-l border border-brand-red-500 text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300"
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
          href={`?${nextSearchparams.toString()}`}
          className="flex w-11 items-center justify-center rounded-r border border-brand-red-500 text-brand-red-500 hover:border-brand-red-300 hover:text-brand-red-300"
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
