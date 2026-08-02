import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { WikiPageIcon } from "@/modules/wiki/components/WikiPageIcon";
import { WikiSearch } from "@/modules/wiki/components/WikiSearch";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import {
  getWikiContext,
  type WikiContextPage,
} from "@/modules/wiki/queries/getWikiContext";
import {
  getWikiFavoritePageIds,
  getWikiRecentVisitPageIds,
} from "@/modules/wiki/queries/getWikiFavorites";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { forbidden } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

const RECENT_LIMIT = 8;

export default async function Page() {
  await requireAuthenticationPage("/app/wiki");

  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
    >
      <SuspenseWithErrorBoundaryTile>
        <Landing />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}

const Landing = async () => {
  const [context, favoriteIds, recentVisitPageIds] = await Promise.all([
    getWikiContext(),
    getWikiFavoritePageIds(),
    getWikiRecentVisitPageIds(),
  ]);
  if (!context) forbidden();

  const visiblePage = (pageId: string) =>
    getAccessibleWikiPage(context, pageId, "read");

  const recentlyVisited = recentVisitPageIds
    .map(visiblePage)
    .filter((page) => page !== null)
    .slice(0, RECENT_LIMIT);

  const recentlyUpdated = context.pages
    .filter((page) => context.permissions.get(page.id)?.canRead)
    .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <div className="flex flex-col gap-0.5">
      <section className="bg-secondary rounded-primary p-4">
        <WikiSearch className="mx-auto w-full max-w-xl" />
      </section>

      {(recentlyVisited.length > 0 || recentlyUpdated.length > 0) && (
        <div className="grid gap-0.5 lg:grid-cols-2">
          {recentlyVisited.length > 0 && (
            <PageListSection
              heading="Zuletzt besucht"
              pages={recentlyVisited}
            />
          )}

          {recentlyUpdated.length > 0 && (
            <PageListSection
              heading="Zuletzt aktualisiert"
              pages={recentlyUpdated}
              showUpdatedAt
            />
          )}
        </div>
      )}
    </div>
  );
};

interface PageListSectionProps {
  readonly heading: string;
  readonly pages: WikiContextPage[];
  readonly showUpdatedAt?: boolean;
}

const PageListSection = ({
  heading,
  pages,
  showUpdatedAt = false,
}: PageListSectionProps) => {
  return (
    <section className="bg-secondary rounded-primary p-4">
      <h2 className="font-mono uppercase font-bold text-xl">{heading}</h2>

      <ul className="mt-4 flex flex-col gap-2">
        {pages.map((page) => (
          <li
            key={page.id}
            className="flex items-baseline justify-between gap-2"
          >
            <Link
              href={`/app/wiki/${page.id}/${page.slug}`}
              className="inline-flex items-center gap-2 text-interaction-500 hover:text-interaction-300"
            >
              {page.iconId && <WikiPageIcon iconId={page.iconId} />}
              {page.title}
            </Link>

            {showUpdatedAt && (
              <span className="text-sm text-neutral-500">
                {formatDate(page.updatedAt)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
