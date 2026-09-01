import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import { WikiPageAccessType } from "@sam-monorepo/database/client";
import {
  resolveWikiPageReadRoleIds,
  type ResolvedWikiPagePermissions,
} from "@sam-monorepo/permissions";
import type { ReactNode } from "react";
import { FaExternalLinkAlt, FaHistory } from "react-icons/fa";
import { renameWikiPage } from "../actions/renameWikiPage";
import type { WikiContext, WikiContextPage } from "../queries/getWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import type { WikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { getWikiPageStaticContent } from "../queries/getWikiPageStaticContent";
import { getWikiPermissionRoles } from "../queries/getWikiPermissionRoles";
import { collectVisibleWikiSubtree } from "../utils/collectVisibleWikiSubtree";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { getWikiCollabUrl } from "../utils/getWikiCollabUrl";
import {
  getManageableWikiPageTargets,
  type WikiPageTargetOption,
} from "../utils/getWikiPageTargets";
import { resolveWikiPageEffectivePermissions } from "../utils/resolveWikiPageEffectivePermissions";
import {
  buildWikiPageSnapshotsHref,
  getWikiPageRouteHref,
  GLOBAL_WIKI_HREF_MODE,
  WikiScope,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import { getWikiRoleReadAudienceLabel } from "../utils/wikiReadAudienceLabel";
import { CopyWikiPageModal } from "./CopyWikiPageModal";
import { DeleteWikiPageModal } from "./DeleteWikiPageModal";
import { MoveWikiPageModal } from "./MoveWikiPageModal";
import { ReportWikiPageModal } from "./ReportWikiPageModal";
import { TrackWikiPageVisit } from "./TrackWikiPageVisit";
import { WikiEditModeProvider } from "./WikiEditModeProvider";
import { WikiEditModeToggle } from "./WikiEditModeToggle";
import { WikiPageDetailsPopover } from "./WikiPageDetailsPopover";
import { WikiPageEditorSection } from "./WikiPageEditorSection";
import { WikiPageExportImportModal } from "./WikiPageExportImportModal";
import { WikiPageFavoriteButton } from "./WikiPageFavoriteButton";
import { WikiPageIconButton } from "./WikiPageIconButton";
import { WikiPagePermissionsButton } from "./WikiPagePermissionsButton";
import { WikiPagePermissionsProvider } from "./WikiPagePermissionsProvider";
import { WikiPageSidebarModeModal } from "./WikiPageSidebarModeModal";
import { WikiPageTags } from "./WikiPageTags";
import { WikiPageVisibilityBadge } from "./WikiPageVisibilityBadge";

interface Props {
  /** Always the global context — variant embeds keep the role model */
  readonly context: WikiContext;
  readonly page: WikiContextPage;
  readonly permissions: ResolvedWikiPagePermissions;
  /** The view scope the page renders under; the global wiki by default */
  readonly hrefMode?: WikiPageHrefMode;
  /**
   * Variant embeds pass their scoped static content (embed-internal links);
   * defaults to the global resolution
   */
  readonly staticContent?: WikiPageStaticContent;
  /**
   * Variant embeds pass subtree-limited targets; defaults to all managed
   * pages
   */
  readonly moveTargets?: WikiPageTargetOption[];
  /** Extra header content, e.g. the variant backlinks on the global route */
  readonly headerExtra?: ReactNode;
}

/**
 * The role-model page view shared by the global wiki route and the variant
 * embeds (the event wiki has its own, differently-permissioned component).
 * Inside an embed the linked root page is locked: rename, move and delete
 * disappear — the same page stays fully editable under /app/wiki, so this
 * is a UX guard against accidentally dismantling the embed, not a security
 * boundary.
 */
export const WikiPageContent = async ({
  context,
  page,
  permissions,
  hrefMode = GLOBAL_WIKI_HREF_MODE,
  staticContent,
  moveTargets,
  headerExtra,
}: Props) => {
  const isVariantScope = hrefMode.scope === WikiScope.Variant;
  const isLockedRoot = page.id === hrefMode.rootPageId;

  const [
    effectiveOwner,
    resolvedStaticContent,
    favoritePageIds,
    pageTags,
    /**
     * Resolving permissions role by role needs every role of the org. The
     * visibility badge in the header needs the result for every reader, so
     * this is on the path of every page view.
     */
    permissionRoles,
  ] = await Promise.all([
    permissions.effectiveOwnerId
      ? prisma.entity.findUnique({
          where: { id: permissions.effectiveOwnerId },
          select: { id: true, handle: true },
        })
      : Promise.resolve(null),
    staticContent ?? getWikiPageStaticContent(context, page.id),
    getWikiFavoritePageIds(),
    prisma.wikiPageTag.findMany({
      where: { pageId: page.id },
      select: { tag: { select: { id: true, name: true } } },
      orderBy: { tag: { name: "asc" } },
    }),
    getWikiPermissionRoles(),
  ]);

  const descendantIds = collectWikiPageDescendants(context.pages, page.id);
  /** What the copy dialog's "Unterseiten mitkopieren" would copy */
  const visibleDescendantCount = collectVisibleWikiSubtree(
    context.pages,
    page.id,
    (id) => context.permissions.get(id)?.canRead === true,
  ).length;

  const authentication = await authenticate();

  const resolvedMoveTargets: WikiPageTargetOption[] = permissions.canAdmin
    ? (moveTargets ?? getManageableWikiPageTargets(context, page.id))
    : [];

  const sourceTitle = (sourceId: string) =>
    sourceId === page.id ? undefined : context.pagesById.get(sourceId)?.title;

  const roleIdsOf = (type: WikiPageAccessType) =>
    page.roleAccess
      .filter((access) => access.type === type)
      .map((access) => access.roleId);

  /**
   * Roles that cannot read the parent grant nothing here, so the dialog does
   * not offer them as selected — saving then drops them for good. Stored
   * entries like these are left over from before a parent was narrowed.
   */
  const grantingRoleIdsOf = (type: WikiPageAccessType) =>
    page.parentId
      ? roleIdsOf(type).filter((roleId) => parentReadRoleIds.includes(roleId))
      : roleIdsOf(type);

  /** Feeds the visibility badge; the dialog reuses the very same result */
  const effectivePermissions = resolveWikiPageEffectivePermissions(
    context.allPages,
    permissionRoles,
    page.id,
    {
      ownerHandle: effectiveOwner?.handle ?? null,
      ownerInheritedFrom: sourceTitle(permissions.ownerSourceId),
      titleOf: (pageId) => context.pagesById.get(pageId)?.title,
    },
  );
  /** Only the dialog narrows the role selectors by the parent's readers */
  const parentReadRoleIds =
    permissions.canAdmin && page.parentId
      ? [
          ...resolveWikiPageReadRoleIds(
            context.allPages,
            permissionRoles,
            page.parentId,
            context.pagesById,
          ),
        ]
      : [];

  const canCreateTopLevel = Boolean(
    !isVariantScope &&
    authentication &&
    (await authentication.authorize("wiki", "create")),
  );

  const collabUrl = getWikiCollabUrl();

  const article = (
    <article className="bg-secondary rounded-primary p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl">
            <WikiPageIconButton
              pageId={page.id}
              iconId={page.iconId}
              canAdmin={permissions.canAdmin}
            />

            {permissions.canAdmin && !isLockedRoot ? (
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

          <p className="mt-1 text-xs text-white/20">
            <WikiPageDetailsPopover pageId={page.id} />{" "}
            <span className="uppercase font-mono">Aktualisiert:</span>{" "}
            {formatDate(page.updatedAt)}
            {effectiveOwner && (
              <>
                {" · "}
                <span className="uppercase font-mono">Besitzer:</span>{" "}
                <CitizenLink citizen={effectiveOwner} />
              </>
            )}
            {" · "}
            <WikiPageVisibilityBadge
              label={getWikiRoleReadAudienceLabel(
                effectivePermissions.readAudience,
              )}
            />
          </p>

          {headerExtra}
        </div>

        <div className="flex flex-wrap gap-1">
          {permissions.canEdit && collabUrl && <WikiEditModeToggle />}

          {isVariantScope && (
            <Button2
              as={Link}
              href={getWikiPageRouteHref(page)}
              variant={Button2Variant.IconOnly}
              tooltip="Im Wiki öffnen"
            >
              <FaExternalLinkAlt />
            </Button2>
          )}

          <WikiPageFavoriteButton
            pageId={page.id}
            isFavorite={favoritePageIds.has(page.id)}
          />

          <ReportWikiPageModal pageId={page.id} title={page.title} />

          <CopyWikiPageModal
            pageId={page.id}
            title={page.title}
            visibleDescendantCount={visibleDescendantCount}
          />

          {permissions.canAdmin && (
            <>
              <Button2
                as={Link}
                href={buildWikiPageSnapshotsHref(hrefMode, page.id)}
                variant={Button2Variant.IconOnly}
                tooltip="Snapshots"
              >
                <FaHistory />
              </Button2>
              {!isLockedRoot && (
                <MoveWikiPageModal
                  pageId={page.id}
                  targets={resolvedMoveTargets}
                  allowTopLevel={canCreateTopLevel}
                  currentParentId={page.parentId}
                />
              )}
              <WikiPageSidebarModeModal
                pageId={page.id}
                sidebarMode={page.sidebarMode}
              />
              <WikiPagePermissionsButton />

              {!isLockedRoot && (
                <DeleteWikiPageModal
                  pageId={page.id}
                  title={page.title}
                  descendantCount={descendantIds.length}
                />
              )}
            </>
          )}

          {context.viewer.hasWikiManage && (
            <WikiPageExportImportModal
              pageId={page.id}
              title={page.title}
              canImport
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
          staticContent={resolvedStaticContent}
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
       * Only page managers get the dialog — its role ids must not reach
       * anybody else — so for every other reader the visibility badge
       * stays plain text.
       */}
      {permissions.canAdmin ? (
        <WikiPagePermissionsProvider
          page={{
            id: page.id,
            parentId: page.parentId,
            ownerId: page.ownerId,
            visibility: page.visibility,
            editability: page.editability,
            imageUploadability: page.imageUploadability,
            attachmentUploadability: page.attachmentUploadability,
          }}
          effectiveOwnerHandle={effectiveOwner?.handle ?? null}
          readRoleIds={grantingRoleIdsOf(WikiPageAccessType.READ)}
          editRoleIds={grantingRoleIdsOf(WikiPageAccessType.EDIT)}
          adminRoleIds={grantingRoleIdsOf(WikiPageAccessType.ADMIN)}
          inheritedFrom={{
            visibility: sourceTitle(permissions.visibilitySourceId),
            editability: sourceTitle(permissions.editabilitySourceId),
            imageUploadability: sourceTitle(
              permissions.imageUploadabilitySourceId,
            ),
            attachmentUploadability: sourceTitle(
              permissions.attachmentUploadabilitySourceId,
            ),
          }}
          parentTitle={
            page.parentId
              ? context.pagesById.get(page.parentId)?.title
              : undefined
          }
          parentReadRoleIds={parentReadRoleIds}
          effectivePermissions={effectivePermissions}
          hasDescendants={descendantIds.length > 0}
        >
          {article}
        </WikiPagePermissionsProvider>
      ) : (
        article
      )}
    </WikiEditModeProvider>
  );
};
