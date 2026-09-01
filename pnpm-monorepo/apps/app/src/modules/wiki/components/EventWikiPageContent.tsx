import { prisma } from "@/db";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ResolvedEventWikiPagePermissions } from "@sam-monorepo/permissions";
import { FaHistory } from "react-icons/fa";
import { renameWikiPage } from "../actions/renameWikiPage";
import {
  type EventWikiContext,
  type EventWikiContextPage,
} from "../queries/getEventWikiContext";
import { getEventWikiPageStaticContent } from "../queries/getEventWikiPageStaticContent";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { collectVisibleWikiSubtree } from "../utils/collectVisibleWikiSubtree";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { getEffectiveEventWikiScope } from "../utils/getEffectiveEventWikiScope";
import { getEventWikiPositionOptions } from "../utils/getEventWikiPositionOptions";
import { getWikiCollabUrl } from "../utils/getWikiCollabUrl";
import { getManageableWikiPageTargets } from "../utils/getWikiPageTargets";
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import { createEventWikiHrefMode } from "../utils/wikiPageHref";
import { getEventWikiReadAudienceLabel } from "../utils/wikiReadAudienceLabel";
import { CopyWikiPageModal } from "./CopyWikiPageModal";
import { DeleteWikiPageModal } from "./DeleteWikiPageModal";
import { EventWikiPagePermissionsProvider } from "./EventWikiPagePermissionsProvider";
import { MoveWikiPageModal } from "./MoveWikiPageModal";
import { ReportWikiPageModal } from "./ReportWikiPageModal";
import { TrackWikiPageVisit } from "./TrackWikiPageVisit";
import { WikiEditModeProvider } from "./WikiEditModeProvider";
import { WikiEditModeToggle } from "./WikiEditModeToggle";
import { WikiPageEditorSection } from "./WikiPageEditorSection";
import { WikiPageExportImportModal } from "./WikiPageExportImportModal";
import { WikiPageFavoriteButton } from "./WikiPageFavoriteButton";
import { WikiPageIconButton } from "./WikiPageIconButton";
import { WikiPagePermissionsButton } from "./WikiPagePermissionsButton";
import { WikiPageSidebarModeModal } from "./WikiPageSidebarModeModal";
import { WikiPageTags } from "./WikiPageTags";
import { WikiPageVisibilityBadge } from "./WikiPageVisibilityBadge";

interface Props {
  readonly context: EventWikiContext;
  readonly page: EventWikiContextPage;
  readonly permissions: ResolvedEventWikiPagePermissions;
}

/**
 * An event wiki page: header, actions and content. Shared by the briefing
 * root route (which serves the locked root page) and the child page route.
 * Callers must have checked the viewer's read permission.
 */
export const EventWikiPageContent = async ({
  context,
  page,
  permissions,
}: Props) => {
  const [staticContent, favoritePageIds, pageTags] = await Promise.all([
    getEventWikiPageStaticContent(context, page.id),
    getWikiFavoritePageIds(),
    prisma.wikiPageTag.findMany({
      where: { pageId: page.id },
      select: { tag: { select: { id: true, name: true } } },
      orderBy: { tag: { name: "asc" } },
    }),
  ]);

  const hrefMode = createEventWikiHrefMode(
    context.container,
    context.rootPage?.id ?? null,
  );
  const isRootPage = isEventWikiRootPage(page);
  /**
   * The freeze keeps canAdmin (read-only manage views), so the mutating
   * affordances hide on it explicitly.
   */
  const canMutateStructure =
    permissions.canAdmin && !context.frozen && !isRootPage;
  const canAdministrate = permissions.canAdmin;
  const canManagePermissions = canAdministrate && !context.frozen;

  const readAudienceLabel = getEventWikiReadAudienceLabel(
    getEffectiveEventWikiScope(context, page.id, "read"),
    (positionId) =>
      context.positions.find((position) => position.id === positionId)?.name,
  );

  const descendantIds = collectWikiPageDescendants(context.pages, page.id);
  /** What the copy dialog's "Unterseiten mitkopieren" would copy */
  const visibleDescendantCount = collectVisibleWikiSubtree(
    context.pages,
    page.id,
    (id) => context.permissions.get(id)?.canRead === true,
  ).length;

  /** Title of the page an inherited scope comes from, for the dialog */
  const sourceTitle = (sourceId: string | undefined) =>
    !sourceId || sourceId === page.id
      ? undefined
      : context.pagesById.get(sourceId)?.title;
  const moveTargets = canMutateStructure
    ? getManageableWikiPageTargets(context, page.id)
    : [];
  const collabUrl = getWikiCollabUrl();

  const article = (
    <article className="bg-secondary rounded-primary p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl">
            <WikiPageIconButton
              pageId={page.id}
              iconId={page.iconId}
              canAdmin={canAdministrate && !context.frozen}
            />

            {canMutateStructure ? (
              <EditableInput
                rowId={page.id}
                columnName="title"
                initialValue={page.title}
                action={renameWikiPage}
              />
            ) : (
              page.title
            )}
          </h1>

          {/**
           * Unlike the global page header there is no details popover:
           * its tRPC route resolves via the global context and would 404
           * for event pages. Mounting it needs a scope-aware route first.
           */}
          <p className="mt-1 text-xs text-white/20">
            <span className="uppercase font-mono">Aktualisiert:</span>{" "}
            {formatDate(page.updatedAt)}
            {" · "}
            <WikiPageVisibilityBadge label={readAudienceLabel} />
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {permissions.canEdit && collabUrl && <WikiEditModeToggle />}

          <WikiPageFavoriteButton
            pageId={page.id}
            isFavorite={favoritePageIds.has(page.id)}
          />

          <ReportWikiPageModal pageId={page.id} title={page.title} />

          {/** Copying from a frozen event stays possible, like exporting */}
          <CopyWikiPageModal
            pageId={page.id}
            title={page.title}
            visibleDescendantCount={visibleDescendantCount}
          />

          {canAdministrate && (
            <Button2
              as={Link}
              href={`${hrefMode.basePath}/${page.id}/snapshots`}
              variant={Button2Variant.IconOnly}
              tooltip="Snapshots"
            >
              <FaHistory />
            </Button2>
          )}

          {canMutateStructure && (
            <>
              <MoveWikiPageModal
                pageId={page.id}
                targets={moveTargets}
                allowTopLevel={false}
                currentParentId={page.parentId}
              />
              <WikiPageSidebarModeModal
                pageId={page.id}
                sidebarMode={page.sidebarMode}
              />
            </>
          )}

          <WikiPagePermissionsButton />

          {canMutateStructure && (
            <DeleteWikiPageModal
              pageId={page.id}
              title={page.title}
              descendantCount={descendantIds.length}
            />
          )}

          {canAdministrate && (
            <WikiPageExportImportModal
              pageId={page.id}
              title={page.title}
              canImport={!context.frozen}
            />
          )}
        </div>
      </div>

      <WikiPageTags
        className="mt-1"
        pageId={page.id}
        tags={pageTags.map((entry) => entry.tag)}
        canEdit={permissions.canEdit}
      />

      <div className="mt-4">
        <WikiPageEditorSection
          pageId={page.id}
          canEdit={permissions.canEdit}
          canUploadImages={permissions.canUploadImages}
          canUploadAttachments={permissions.canUploadAttachments}
          staticContent={staticContent}
        />
      </div>
    </article>
  );

  return (
    /**
     * Keyed by page so navigating to another page always starts back in
     * view mode.
     */
    <WikiEditModeProvider key={page.id}>
      <TrackWikiPageVisit pageId={page.id} />

      {/**
       * A frozen event takes the dialog away from its managers too, which
       * leaves the visibility badge as plain text for everybody.
       */}
      {canManagePermissions ? (
        <EventWikiPagePermissionsProvider
          pageId={page.id}
          isRootPage={isRootPage}
          readScope={page.eventReadScope}
          readScopePositionId={page.eventReadScopePositionId}
          editScope={page.eventEditScope}
          imageUploadability={page.imageUploadability}
          attachmentUploadability={page.attachmentUploadability}
          positionOptions={getEventWikiPositionOptions(context.positions)}
          positions={context.positions.map((position) => ({
            id: position.id,
            parentPositionId: position.parentPositionId,
          }))}
          inheritedFrom={{
            read: sourceTitle(permissions.readScopeSourceId),
            edit: sourceTitle(permissions.editScopeSourceId),
            imageUploadability: sourceTitle(
              permissions.imageUploadabilitySourceId,
            ),
            attachmentUploadability: sourceTitle(
              permissions.attachmentUploadabilitySourceId,
            ),
          }}
          parentReadScope={
            page.parentId
              ? getEffectiveEventWikiScope(context, page.parentId, "read")
              : null
          }
          parentEditScope={
            page.parentId
              ? getEffectiveEventWikiScope(context, page.parentId, "edit")
              : null
          }
        >
          {article}
        </EventWikiPagePermissionsProvider>
      ) : (
        article
      )}
    </WikiEditModeProvider>
  );
};
