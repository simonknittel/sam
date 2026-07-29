import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import {
  getWikiPageReports,
  type WikiPageReportRow,
} from "../queries/getWikiPageReports";

const TABLE_MIN_WIDTH = "min-w-190";
const GRID_COLS = "grid-cols-[minmax(200px,_1fr)_200px_160px_140px_110px]";

const loadSearchParams = createLoader({
  status: parseAsStringLiteral(["open", "resolved", "all"]).withDefault("open"),
  sort: parseAsStringLiteral(["created-desc", "created-asc"]).withDefault(
    "created-desc",
  ),
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const WikiReportsTable = async ({ className, searchParams }: Props) => {
  const { status, sort, q } = await loadSearchParams(searchParams);

  const reports = await getWikiPageReports();

  const filteredReports = reports.filter((report) => {
    if (q) {
      const searchQuery = q.toLowerCase();
      const matchesPage = report.page.title.toLowerCase().includes(searchQuery);
      const matchesReporter = (report.createdBy?.handle ?? "")
        .toLowerCase()
        .includes(searchQuery);
      if (!matchesPage && !matchesReporter) return false;
    }
    switch (status) {
      case "open":
        return report.resolvedAt === null;
      case "resolved":
        return report.resolvedAt !== null;
      case "all":
        return true;
      default:
        throw new Error(`Unknown status: ${status satisfies never}`);
    }
  });

  const sortedReports = filteredReports.toSorted((a, b) => {
    switch (sort) {
      case "created-desc":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "created-asc":
        return a.createdAt.getTime() - b.createdAt.getTime();
      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table tableClassName={TABLE_MIN_WIDTH}>
        <THead className={GRID_COLS}>
          <th>Grund</th>

          <th>Seite</th>

          <th>Gemeldet von</th>

          <th>Gemeldet am</th>

          <th>Status</th>
        </THead>

        <TBody>
          {sortedReports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </TBody>
      </Table>

      {sortedReports.length <= 0 && (
        <p className="text-neutral-500 italic">Keine Meldungen vorhanden</p>
      )}
    </section>
  );
};

interface ReportRowProps {
  readonly report: WikiPageReportRow;
}

const ReportRow = ({ report }: ReportRowProps) => {
  return (
    <TRow className={clsx("h-10", GRID_COLS)}>
      <td className="overflow-hidden">
        <Link
          href={`/app/wiki/reports/${report.id}`}
          className="flex items-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
          prefetch={false}
          title={report.message}
        >
          <p className="font-bold truncate">{report.message}</p>
        </Link>
      </td>

      <td className="overflow-hidden">
        {report.page.deletedAt === null ? (
          <Link
            href={`/app/wiki/${report.page.id}/${report.page.slug}`}
            className="flex items-center gap-2 hover:bg-white/10 px-2 rounded-secondary h-8"
            prefetch={false}
            title={report.page.title}
          >
            <p className="truncate">{report.page.title}</p>
          </Link>
        ) : (
          <p
            className="truncate px-2 text-white/40"
            title={`${report.page.title} (gelöscht)`}
          >
            {report.page.title} (gelöscht)
          </p>
        )}
      </td>

      <td className="truncate">
        <CitizenLink citizen={report.createdBy} />
      </td>

      <td>{formatDate(report.createdAt)}</td>

      <td>
        {report.resolvedAt === null ? (
          <span className="text-amber-400">Offen</span>
        ) : (
          <span className="text-green-500">Bearbeitet</span>
        )}
      </td>
    </TRow>
  );
};
