import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiPageIcon } from "@/modules/wiki/components/WikiPageIcon";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { buildVisibleWikiBreadcrumb } from "@/modules/wiki/utils/buildVisibleWikiBreadcrumb";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { FaSitemap, FaTag } from "react-icons/fa";

type Params = PageProps<"/app/wiki/tags/[tagId]">["params"];

const getTag = async (params: Params) => {
  const { tagId } = await params;
  return prisma.wikiTag.findUnique({
    where: { id: tagId },
    select: { id: true, name: true, pages: { select: { pageId: true } } },
  });
};

export const generateMetadata = async (
  props: PageProps<"/app/wiki/tags/[tagId]">,
): Promise<Metadata> => {
  const tag = await getTag(props.params);
  if (!tag) return {};
  return { title: `Tag: ${tag.name}` };
};

export default async function Page(props: PageProps<"/app/wiki/tags/[tagId]">) {
  await requireAuthenticationPage("/app/wiki");

  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
    >
      <SuspenseWithErrorBoundaryTile>
        <TagPageList params={props.params} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}

interface TagPageListProps {
  readonly params: Params;
}

const TagPageList = async ({ params }: TagPageListProps) => {
  const [context, tag] = await Promise.all([getWikiContext(), getTag(params)]);
  if (!context) forbidden();
  if (!tag) notFound();

  /**
   * Tag names themselves are not permission-gated (they also appear in the
   * autocomplete), but the page list is: invisible and deleted pages are
   * silently omitted.
   */
  const pages = tag.pages
    .map((assignment) =>
      getAccessibleWikiPage(context, assignment.pageId, "read"),
    )
    .filter((page) => page !== null)
    .toSorted((a, b) => a.title.localeCompare(b.title));

  return (
    <section className="bg-secondary rounded-primary p-4">
      <h1 className="flex items-center gap-3 font-bold text-2xl">
        <FaTag className="flex-none text-neutral-500" />
        {tag.name}
      </h1>

      <p className="mt-1 text-xs text-white/20">
        <span className="uppercase font-mono">Seiten mit diesem Tag:</span>{" "}
        {pages.length}
      </p>

      {pages.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {pages.map((page) => {
            const breadcrumb = buildVisibleWikiBreadcrumb(context, page);

            return (
              <li key={page.id}>
                {breadcrumb.length > 0 && (
                  <p
                    className="text-xs text-neutral-500 truncate"
                    title={breadcrumb.join(" / ")}
                  >
                    {breadcrumb.join(" / ")}
                  </p>
                )}

                <Link
                  href={`/app/wiki/${page.id}/${page.slug}`}
                  className="inline-flex items-center gap-2 text-interaction-500 hover:text-interaction-300"
                >
                  {page.iconId && <WikiPageIcon iconId={page.iconId} />}
                  {page.title}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-neutral-400">
          Keine sichtbaren Seiten mit diesem Tag.
        </p>
      )}
    </section>
  );
};
