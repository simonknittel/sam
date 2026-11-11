import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantWikiSidebar } from "@/modules/wiki/components/VariantWikiSidebar";
import type { SearchParams } from "nuqs/server";
import type { ReactNode } from "react";
import { FaSitemap } from "react-icons/fa";
import { getCanLinkVariantWikiPage } from "../queries/canLinkVariantWikiPage";
import { VariantDetailHeader, type VariantDetail } from "./VariantDetailHeader";
import { VariantShipsTile } from "./VariantShipsTile";
import { VariantWikiPagePrompt } from "./VariantWikiPagePrompt";

interface Props {
  readonly variant: VariantDetail;
  /**
   * The embedded wiki node (start page, subpage or snapshots), rendered
   * between the metadata and the ships table; nothing renders when absent
   * (no linked page, or the viewer cannot read it)
   */
  readonly wikiContent?: ReactNode;
  readonly searchParams: Promise<SearchParams>;
}

/**
 * The variant detail frame shared by the plain variant page and its
 * embedded wiki routes: metadata head, the wiki section (sidebar + page,
 * natural height with a sticky sidebar) and the cursor-paginated ships
 * table below. Per-page rather than a layout because layouts cannot read
 * the searchParams the ships cursor lives in.
 */
export const VariantDetailFrame = async ({
  variant,
  wikiContent,
  searchParams,
}: Props) => {
  const authentication = await requireAuthenticationPage();
  const hasWikiContent = wikiContent !== undefined && wikiContent !== null;
  const [hasOtherShipsRead, canManageCatalog, canCreateTopLevelWikiPage] =
    await Promise.all([
      authentication.authorize("otherShips", "read"),
      authentication.authorize("manufacturersSeriesAndVariants", "manage"),
      authentication.authorize("wiki", "create"),
    ]);
  const showWikiPagePrompt =
    !hasWikiContent && (await getCanLinkVariantWikiPage(variant.id));

  return (
    <div className="flex flex-col gap-0.5">
      <VariantDetailHeader
        variant={variant}
        showSettingsLink={canManageCatalog}
      />

      {hasWikiContent && (
        <div className="mt-2">
          <SidebarLayout
            sidebar={<VariantWikiSidebar variantId={variant.id} />}
            mobileToggleLabel="Seiten"
            mobileToggleIcon={<FaSitemap />}
            sidebarWidthClassName="md:w-80"
            sidebarClassName="md:sticky md:top-16 lg:top-32 md:self-start md:max-h-[calc(100dvh-9rem)] md:overflow-y-auto md:overscroll-contain"
          >
            {wikiContent}
          </SidebarLayout>
        </div>
      )}

      {showWikiPagePrompt && (
        <VariantWikiPagePrompt
          className="mt-2"
          variant={{ id: variant.id, name: variant.name }}
          allowTopLevel={canCreateTopLevelWikiPage}
        />
      )}

      {hasOtherShipsRead && (
        <SuspenseWithErrorBoundaryTile className="mt-2">
          <VariantShipsTile
            variant={variant}
            className="mt-2"
            searchParams={searchParams}
          />
        </SuspenseWithErrorBoundaryTile>
      )}
    </div>
  );
};
