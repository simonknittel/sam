import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantDetailFrame } from "@/modules/fleet/components/VariantDetailFrame";
import { getVariantDetail } from "@/modules/fleet/queries/variantDetail";
import { canViewVariantPages } from "@/modules/fleet/utils/canViewVariantPages";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { buildWikiPageHref } from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params =
  PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/snapshots">["params"];

const getAdministrablePage = async (params: Params) => {
  const { variantId, pageId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "admin");
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/snapshots">,
): Promise<Metadata> => {
  const result = await getAdministrablePage(props.params);
  if (!result) return {};
  return { title: `Snapshots - ${result.page.title}` };
};

export default async function Page(
  props: PageProps<"/app/fleet/variant/[variantId]/wiki/[pageId]/snapshots">,
) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/variant/[variantId]/wiki/[pageId]/snapshots",
  );

  /** The same 403 behavior as the variant page this route extends */
  if (!(await canViewVariantPages(authentication))) {
    await authentication.authorizePage("ship", "manage");
  }

  const { variantId } = await props.params;
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  const result = await getAdministrablePage(props.params);
  /**
   * Pages the viewer can't administrate 404 instead of 403 to avoid
   * leaking their existence.
   */
  if (!result) notFound();

  return (
    <VariantDetailFrame
      variant={variant}
      searchParams={props.searchParams}
      wikiContent={
        <SuspenseWithErrorBoundaryTile>
          <WikiSnapshotsTable
            page={result.page}
            pageHref={buildWikiPageHref(result.context.hrefMode, result.page)}
            canRestore
          />
        </SuspenseWithErrorBoundaryTile>
      }
    />
  );
}
