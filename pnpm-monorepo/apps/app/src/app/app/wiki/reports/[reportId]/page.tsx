import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import { ResolveWikiPageReportForm } from "@/modules/wiki/components/ResolveWikiPageReportForm";
import { WikiPageIcon } from "@/modules/wiki/components/WikiPageIcon";
import { getWikiPageReportById } from "@/modules/wiki/queries/getWikiPageReports";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Meldung",
};

export default async function Page(
  props: PageProps<"/app/wiki/reports/[reportId]">,
) {
  const authentication = await requireAuthenticationPage("/app/wiki/reports");
  await authentication.authorizePage("wiki", "manage");

  const { reportId } = await props.params;
  const report = await getWikiPageReportById(reportId);
  if (!report) notFound();

  return (
    <div>
      <div className="flex items-center gap-2 font-bold text-xl">
        <span className="text-neutral-500">Meldung /</span>
        {report.page.iconId && <WikiPageIcon iconId={report.page.iconId} />}
        <p>{report.page.title}</p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <section className="bg-secondary rounded-primary p-4 lg:p-8">
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[max-content_1fr]">
            <dt className="text-sm text-neutral-500">Seite</dt>
            <dd>
              {report.page.deletedAt === null ? (
                <Link
                  href={`/app/wiki/${report.page.id}/${report.page.slug}`}
                  className="inline-flex items-center gap-2 text-interaction-500 hover:text-interaction-300"
                >
                  {report.page.iconId && (
                    <WikiPageIcon iconId={report.page.iconId} />
                  )}
                  {report.page.title}
                </Link>
              ) : (
                <>
                  {report.page.title}
                  <span className="ml-2 text-sm text-neutral-500">
                    (gelöscht)
                  </span>
                </>
              )}
            </dd>

            {report.uploadFileName && (
              <>
                <dt className="text-sm text-neutral-500">Dateianhang</dt>
                <dd>
                  {report.uploadId !== null ? (
                    <a
                      href={`/api/wiki/attachment/${encodeURIComponent(report.uploadId)}`}
                      className="text-interaction-500 hover:text-interaction-300"
                    >
                      {report.uploadFileName}
                    </a>
                  ) : (
                    <>
                      {report.uploadFileName}
                      <span className="ml-2 text-sm text-neutral-500">
                        (gelöscht)
                      </span>
                    </>
                  )}
                </dd>
              </>
            )}

            <dt className="text-sm text-neutral-500">Gemeldet von</dt>
            <dd>
              <CitizenLink citizen={report.createdBy} />
            </dd>

            <dt className="text-sm text-neutral-500">Gemeldet am</dt>
            <dd>{formatDate(report.createdAt)}</dd>

            <dt className="text-sm text-neutral-500">Status</dt>
            <dd>
              {report.resolvedAt === null ? (
                <span className="text-amber-400">Offen</span>
              ) : (
                <span className="text-green-500">Bearbeitet</span>
              )}
            </dd>
          </dl>

          <h2 className="mt-6 text-sm text-neutral-500">Grund</h2>
          <p className="mt-1 whitespace-pre-wrap">{report.message}</p>
        </section>

        {report.resolvedAt === null ? (
          <section className="bg-secondary rounded-primary p-4 lg:p-8">
            <h2 className="font-bold text-xl">Meldung bearbeiten</h2>
            <ResolveWikiPageReportForm reportId={report.id} className="mt-4" />
          </section>
        ) : (
          <section className="bg-secondary rounded-primary p-4 lg:p-8">
            <h2 className="font-bold text-xl">Bearbeitung</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[max-content_1fr]">
              <dt className="text-sm text-neutral-500">Bearbeitet von</dt>
              <dd>
                <CitizenLink citizen={report.resolvedBy} />
              </dd>

              <dt className="text-sm text-neutral-500">Bearbeitet am</dt>
              <dd>{formatDate(report.resolvedAt)}</dd>

              {report.resolutionComment && (
                <>
                  <dt className="text-sm text-neutral-500">Kommentar</dt>
                  <dd className="whitespace-pre-wrap">
                    {report.resolutionComment}
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
