import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { WikiTagPageContent } from "@/modules/wiki/components/WikiTagPageContent";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "@/modules/wiki/queries/getEventWikiContext";
import { buildVisibleWikiBreadcrumb } from "@/modules/wiki/utils/buildVisibleWikiBreadcrumb";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
} from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = PageProps<"/app/events/[id]/briefing/tags/[tagId]">["params"];

const getTag = async (params: Params) => {
  const { id, tagId } = await params;
  return prisma.wikiTag.findFirst({
    where: { id: tagId, eventId: id },
    select: { id: true, name: true, pages: { select: { pageId: true } } },
  });
};

/**
 * Metadata runs independently of the layout's 404 gate, so it applies the
 * briefing gate itself — otherwise the tag name would reach the document
 * title for viewers the layout turns away.
 */
export const generateMetadata = async (
  props: PageProps<"/app/events/[id]/briefing/tags/[tagId]">,
): Promise<Metadata> => {
  const { id } = await props.params;
  const context = await getEventWikiContext(toEventContainer(id));
  if (!context || !hasReadableEventWikiRoot(context)) return {};

  const tag = await getTag(props.params);
  if (!tag) return {};
  return { title: `Tag: ${tag.name}` };
};

/**
 * Pages of one event wiki tag — the briefing's counterpart of the global
 * wiki's tag route, scoped to the event's own tags.
 */
export default async function Page(
  props: PageProps<"/app/events/[id]/briefing/tags/[tagId]">,
) {
  await requireAuthenticationPage("/app/events/[id]/briefing/tags/[tagId]");

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
  const { id } = await params;
  const [context, tag] = await Promise.all([
    getEventWikiContext(toEventContainer(id)),
    getTag(params),
  ]);
  if (!context || !hasReadableEventWikiRoot(context)) notFound();
  if (!tag) notFound();

  const hrefMode = createEventWikiHrefMode(
    context.container,
    context.rootPage?.id ?? null,
  );

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
      href: buildWikiPageHref(hrefMode, page),
      title: page.title,
      iconId: page.iconId,
      breadcrumb: buildVisibleWikiBreadcrumb(context, page),
    }));

  return <WikiTagPageContent tagName={tag.name} pages={pages} />;
};
