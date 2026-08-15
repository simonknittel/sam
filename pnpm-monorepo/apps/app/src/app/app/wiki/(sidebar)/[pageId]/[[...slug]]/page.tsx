import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantWikiBacklinks } from "@/modules/fleet/components/VariantWikiBacklinks";
import { WikiPageContent } from "@/modules/wiki/components/WikiPageContent";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params = PageProps<"/app/wiki/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { pageId } = await params;
  const context = await getWikiContext();
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions) return null;

  return { context, page, permissions };
};

export const generateMetadata = async (
  props: PageProps<"/app/wiki/[pageId]/[[...slug]]">,
): Promise<Metadata> => {
  const result = await getVisiblePage(props.params);
  if (!result) return {};
  return { title: result.page.title };
};

export default async function Page(
  props: PageProps<"/app/wiki/[pageId]/[[...slug]]">,
) {
  await requireAuthenticationPage("/app/wiki");

  const result = await getVisiblePage(props.params);
  /**
   * Invisible pages 404 instead of 403 to avoid leaking their existence.
   */
  if (!result) notFound();

  const { context, page, permissions } = result;

  const { slug } = await props.params;
  if (slug?.[0] !== page.slug) redirect(`/app/wiki/${page.id}/${page.slug}`);

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiPageContent
        context={context}
        page={page}
        permissions={permissions}
        headerExtra={<VariantWikiBacklinks pageId={page.id} />}
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
