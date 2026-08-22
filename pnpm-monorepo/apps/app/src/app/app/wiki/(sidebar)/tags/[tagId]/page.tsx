import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiTagPageContent } from "@/modules/wiki/components/WikiTagPageContent";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { buildVisibleWikiBreadcrumb } from "@/modules/wiki/utils/buildVisibleWikiBreadcrumb";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import {
  buildWikiPageHref,
  GLOBAL_WIKI_HREF_MODE,
} from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

type Params = PageProps<"/app/wiki/tags/[tagId]">["params"];

const getTag = async (params: Params) => {
  const { tagId } = await params;
  return prisma.wikiTag.findFirst({
    /** Both container columns NULL is what makes a tag global */
    where: { id: tagId, eventId: null, templateId: null },
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
    <SuspenseWithErrorBoundaryTile>
      <TagPageList params={props.params} />
    </SuspenseWithErrorBoundaryTile>
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
    .toSorted((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({
      href: buildWikiPageHref(GLOBAL_WIKI_HREF_MODE, page),
      title: page.title,
      iconId: page.iconId,
      breadcrumb: buildVisibleWikiBreadcrumb(context, page),
    }));

  return <WikiTagPageContent tagName={tag.name} pages={pages} />;
};
