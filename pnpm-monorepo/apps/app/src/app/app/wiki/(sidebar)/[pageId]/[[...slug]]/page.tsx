import { prisma } from "@/db";
import { authenticate, requireAuthenticationPage } from "@/modules/auth/server";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { renameWikiPage } from "@/modules/wiki/actions/renameWikiPage";
import { DeleteWikiPageModal } from "@/modules/wiki/components/DeleteWikiPageModal";
import { DuplicateWikiPageModal } from "@/modules/wiki/components/DuplicateWikiPageModal";
import { MoveWikiPageModal } from "@/modules/wiki/components/MoveWikiPageModal";
import { ReportWikiPageModal } from "@/modules/wiki/components/ReportWikiPageModal";
import { WikiEditModeProvider } from "@/modules/wiki/components/WikiEditModeProvider";
import { WikiEditModeToggle } from "@/modules/wiki/components/WikiEditModeToggle";
import { WikiPageDetailsPopover } from "@/modules/wiki/components/WikiPageDetailsPopover";
import { WikiPageEditorSection } from "@/modules/wiki/components/WikiPageEditorSection";
import { WikiPageExportImportModal } from "@/modules/wiki/components/WikiPageExportImportModal";
import { WikiPageFavoriteButton } from "@/modules/wiki/components/WikiPageFavoriteButton";
import { WikiPageIconButton } from "@/modules/wiki/components/WikiPageIconButton";
import { WikiPagePermissionsModal } from "@/modules/wiki/components/WikiPagePermissionsModal";
import { WikiPageSidebarModeModal } from "@/modules/wiki/components/WikiPageSidebarModeModal";
import { WikiPageTags } from "@/modules/wiki/components/WikiPageTags";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "@/modules/wiki/queries/getWikiContext";
import { getWikiFavoritePageIds } from "@/modules/wiki/queries/getWikiFavorites";
import { getWikiPageStaticContent } from "@/modules/wiki/queries/getWikiPageStaticContent";
import { getWikiPermissionRoles } from "@/modules/wiki/queries/getWikiPermissionRoles";
import { collectWikiPageDescendants } from "@/modules/wiki/utils/collectWikiPageDescendants";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { getWikiCollabUrl } from "@/modules/wiki/utils/getWikiCollabUrl";
import {
  getManageableWikiPageTargets,
  type WikiPageTargetOption,
} from "@/modules/wiki/utils/getWikiPageTargets";
import { resolveWikiPageEffectivePermissions } from "@/modules/wiki/utils/resolveWikiPageEffectivePermissions";
import { resolveWikiPageReadRoleIds } from "@/modules/wiki/utils/resolveWikiPageRolePermissions";
import { trackWikiPageVisit } from "@/modules/wiki/utils/trackWikiPageVisit";
import { WikiPageAccessType } from "@sam-monorepo/database/client";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FaHistory } from "react-icons/fa";

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
      <PageContent context={context} page={page} permissions={permissions} />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface PageContentProps {
  readonly context: WikiContext;
  readonly page: WikiContextPage;
  readonly permissions: NonNullable<
    ReturnType<WikiContext["permissions"]["get"]>
  >;
}

const PageContent = async ({
  context,
  page,
  permissions,
}: PageContentProps) => {
  const [effectiveOwner, staticContent, favoritePageIds, pageTags] =
    await Promise.all([
      permissions.effectiveOwnerId
        ? prisma.entity.findUnique({
            where: { id: permissions.effectiveOwnerId },
            select: { id: true, handle: true },
          })
        : Promise.resolve(null),
      getWikiPageStaticContent(context, page.id),
      getWikiFavoritePageIds(),
      prisma.wikiPageTag.findMany({
        where: { pageId: page.id },
        select: { tag: { select: { id: true, name: true } } },
        orderBy: { tag: { name: "asc" } },
      }),
    ]);

  const descendantIds = collectWikiPageDescendants(context.pages, page.id);

  const authentication = await authenticate();
  const session = authentication ? authentication.session : null;

  trackWikiPageVisit(session?.entity?.id ?? null, page.id);

  const moveTargets: WikiPageTargetOption[] = permissions.canAdmin
    ? getManageableWikiPageTargets(context, page.id)
    : [];

  /**
   * Unlike moving, duplicating into the page's own subtree is fine — the
   * copy is a new page, so no cycle can occur.
   */
  const duplicateTargets = getManageableWikiPageTargets(context);

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

  /**
   * Input of the permissions dialog. Resolving permissions role by role
   * needs every role of the org, so it only happens for page admins — the
   * only ones who get the dialog.
   */
  const permissionRoles = permissions.canAdmin
    ? await getWikiPermissionRoles()
    : [];
  const effectivePermissions = permissions.canAdmin
    ? resolveWikiPageEffectivePermissions(
        context.allPages,
        permissionRoles,
        page.id,
        {
          ownerHandle: effectiveOwner?.handle ?? null,
          ownerInheritedFrom: sourceTitle(permissions.ownerSourceId),
          titleOf: (pageId) => context.pagesById.get(pageId)?.title,
        },
      )
    : { read: [], edit: [], inheritedAdmin: [] };
  const parentReadRoleIds =
    permissions.canAdmin && page.parentId
      ? [
          ...resolveWikiPageReadRoleIds(
            context.allPages,
            permissionRoles,
            page.parentId,
          ),
        ]
      : [];

  const canCreateTopLevel = Boolean(
    authentication && (await authentication.authorize("wiki", "create")),
  );

  const collabUrl = getWikiCollabUrl();

  return (
    /**
     * Keyed by page so navigating to another page always starts back in
     * view mode.
     */
    <WikiEditModeProvider key={page.id}>
      <article className="bg-secondary rounded-primary p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="flex items-center gap-2 font-bold text-2xl">
              <WikiPageIconButton
                pageId={page.id}
                iconId={page.iconId}
                canAdmin={permissions.canAdmin}
              />

              {permissions.canAdmin ? (
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
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {permissions.canEdit && collabUrl && <WikiEditModeToggle />}

            <WikiPageFavoriteButton
              pageId={page.id}
              isFavorite={favoritePageIds.has(page.id)}
            />

            <ReportWikiPageModal pageId={page.id} title={page.title} />

            <DuplicateWikiPageModal
              pageId={page.id}
              title={page.title}
              targets={duplicateTargets}
              allowTopLevel={canCreateTopLevel}
              currentParentId={page.parentId}
              hasDescendants={descendantIds.length > 0}
            />

            {permissions.canAdmin && (
              <>
                <Button2
                  as={Link}
                  href={`/app/wiki/${page.id}/snapshots`}
                  variant={Button2Variant.IconOnly}
                  tooltip="Snapshots"
                >
                  <FaHistory />
                </Button2>
                <MoveWikiPageModal
                  pageId={page.id}
                  targets={moveTargets}
                  allowTopLevel={canCreateTopLevel}
                  currentParentId={page.parentId}
                />
                <WikiPageSidebarModeModal
                  pageId={page.id}
                  sidebarMode={page.sidebarMode}
                />
                <WikiPagePermissionsModal
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
                />

                <DeleteWikiPageModal
                  pageId={page.id}
                  title={page.title}
                  descendantCount={descendantIds.length}
                />
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
            staticContent={staticContent}
          />
        </div>
      </article>
    </WikiEditModeProvider>
  );
};
