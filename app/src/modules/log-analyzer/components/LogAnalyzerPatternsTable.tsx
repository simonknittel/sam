import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { limitRows, PER_PAGE } from "@/modules/common/utils/pagination";
import Pagination from "@/modules/spynet/components/Pagination";
import clsx from "clsx";
import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { getLogAnalyzerPatterns } from "../queries/getLogAnalyzerPatterns";

const TABLE_MIN_WIDTH = "min-w-210";
const GRID_COLS = "grid-cols-[minmax(200px,_1fr)_100px]";

const loadSearchParams = createLoader({
  filter: parseAsStringLiteral(["active", "disabled", "deleted"]).withDefault(
    "active",
  ),
  sort: parseAsStringLiteral(["title-asc", "title-desc"]).withDefault(
    "title-asc",
  ),
  q: parseAsString,
  page: parseAsInteger.withDefault(1),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const LogAnalyzerPatternsTable = async ({
  className,
  searchParams,
}: Props) => {
  const { filter, sort, q, page } = await loadSearchParams(searchParams);

  const [sortBy, sortOrder] = sort.split("-") as [
    "title" | "createdAt",
    "asc" | "desc",
  ];

  const patterns = await getLogAnalyzerPatterns({
    status: filter,
    search: q || undefined,
    sortBy,
    sortOrder,
  });

  const totalPages = Math.ceil(patterns.length / PER_PAGE);
  const currentPage = Math.min(Math.max(page, 1), totalPages || 1);
  const limitedPatterns = limitRows(patterns, currentPage);

  const urlSearchParams = new URLSearchParams();
  if (q) urlSearchParams.set("q", q);
  if (filter !== "active") urlSearchParams.set("filter", filter);
  if (sort !== "title-asc") urlSearchParams.set("sort", sort);
  urlSearchParams.set("page", currentPage.toString());

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table tableClassName={TABLE_MIN_WIDTH}>
        <THead className={GRID_COLS}>
          <th>Titel</th>
          <th className="text-center">Status</th>
        </THead>

        <TBody>
          {limitedPatterns.map((pattern) => (
            <TRow key={pattern.id} className={clsx("h-10", GRID_COLS)}>
              <td className="overflow-hidden">
                <Link
                  href={`/app/tools/log-analyzer/patterns/${pattern.id}`}
                  className="flex items-center text-interaction-500 hover:bg-white/5 px-2 h-10 truncate"
                  prefetch={false}
                >
                  {pattern.title}
                </Link>
              </td>

              <td
                className={clsx(
                  "flex items-center justify-center gap-2 font-mono uppercase",
                  {
                    "text-green-500": pattern.disabledAt === null,
                    "text-red-500": pattern.disabledAt !== null,
                  },
                )}
              >
                {pattern.disabledAt === null ? (
                  <>
                    <FaCheckCircle /> Aktiv
                  </>
                ) : (
                  <>
                    <FaTimesCircle /> Deaktiviert
                  </>
                )}
              </td>
            </TRow>
          ))}
        </TBody>
      </Table>

      {limitedPatterns.length <= 0 && (
        <p className="pt-4 text-center">Keine Muster vorhanden</p>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            searchParams={urlSearchParams}
          />
        </div>
      )}
    </section>
  );
};
