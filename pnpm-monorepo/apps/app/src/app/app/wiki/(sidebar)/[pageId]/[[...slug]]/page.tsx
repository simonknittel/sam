import { prisma } from "@/db";
import { env } from "@/env";
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
import { WikiCollabEditor } from "@/modules/wiki/components/WikiCollabEditor";
import { WikiEditModeProvider } from "@/modules/wiki/components/WikiEditModeProvider";
import { WikiEditModeToggle } from "@/modules/wiki/components/WikiEditModeToggle";
import { WikiPageExportImportModal } from "@/modules/wiki/components/WikiPageExportImportModal";
import { WikiPageFavoriteButton } from "@/modules/wiki/components/WikiPageFavoriteButton";
import { WikiPageIconButton } from "@/modules/wiki/components/WikiPageIconButton";
import { WikiPagePermissionsModal } from "@/modules/wiki/components/WikiPagePermissionsModal";
import { WikiPageSidebarModeModal } from "@/modules/wiki/components/WikiPageSidebarModeModal";
import { WikiPageStaticContent } from "@/modules/wiki/components/WikiPageStaticContent";
import { WikiPageTags } from "@/modules/wiki/components/WikiPageTags";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "@/modules/wiki/queries/getWikiContext";
import { getWikiFavoritePageIds } from "@/modules/wiki/queries/getWikiFavorites";
import { getWikiPermissionRoles } from "@/modules/wiki/queries/getWikiPermissionRoles";
import { getWikiIframeAllowlist } from "@/modules/wiki/queries/getWikiSettings";
import { collectWikiPageDescendants } from "@/modules/wiki/utils/collectWikiPageDescendants";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { getWikiCollabColor } from "@/modules/wiki/utils/getWikiCollabColor";
import {
  getManageableWikiPageTargets,
  type WikiPageTargetOption,
} from "@/modules/wiki/utils/getWikiPageTargets";
import { resolveWikiPageEffectivePermissions } from "@/modules/wiki/utils/resolveWikiPageEffectivePermissions";
import { resolveWikiPageIndex } from "@/modules/wiki/utils/resolveWikiPageIndex";
import { resolveWikiPageReadRoleIds } from "@/modules/wiki/utils/resolveWikiPageRolePermissions";
import { resolveWikiRoleCitizens } from "@/modules/wiki/utils/resolveWikiRoleCitizens";
import { trackWikiPageVisit } from "@/modules/wiki/utils/trackWikiPageVisit";
import { WikiPageAccessType } from "@sam-monorepo/database/client";
import {
  collectWikiMentionedCitizenIds,
  collectWikiPageIndexConfigs,
  collectWikiRoleCitizensRoleIds,
  collectWikiVariantLinkIds,
} from "@sam-monorepo/wiki-editor";
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
  const [
    effectiveOwner,
    pageContent,
    iframeAllowlist,
    favoritePageIds,
    pageTags,
  ] = await Promise.all([
    permissions.effectiveOwnerId
      ? prisma.entity.findUnique({
          where: { id: permissions.effectiveOwnerId },
          select: { id: true, handle: true },
        })
      : Promise.resolve(null),
    /**
     * The content is intentionally not part of getWikiContext (which loads
     * all pages on every wiki request) — it's only needed here.
     */
    prisma.wikiPage.findUnique({
      where: { id: page.id },
      select: { content: true },
    }),
    getWikiIframeAllowlist(),
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
  const canReadCitizens = Boolean(
    authentication && (await authentication.authorize("citizen", "read")),
  );

  /**
   * Current handles of the citizens mentioned in the content, so mentions
   * follow handle changes. Mentions inserted after this render fall back to
   * the handle stored in the document. Viewers without the citizen read
   * permission get these insertion-time handles instead of live ones.
   */
  const mentionedCitizenIds = collectWikiMentionedCitizenIds(
    pageContent?.content,
  );
  const mentionedCitizens = Object.fromEntries(
    (canReadCitizens && mentionedCitizenIds.length > 0
      ? await prisma.entity.findMany({
          where: { id: { in: mentionedCitizenIds } },
          select: { id: true, handle: true },
        })
      : []
    ).map((citizen) => [citizen.id, { handle: citizen.handle }]),
  );

  /**
   * Current names and manufacturer logos of the variants linked in the
   * content, so links follow renames. Links inserted after this render
   * resolve themselves client-side (see WikiVariantLinkNodeView).
   * Deliberately not permission-filtered: the wiki shows every reader
   * which ship is meant — only the variant page itself stays gated.
   */
  const linkedVariantIds = collectWikiVariantLinkIds(pageContent?.content);
  const linkedVariants = Object.fromEntries(
    (linkedVariantIds.length > 0
      ? await prisma.variant.findMany({
          where: { id: { in: linkedVariantIds } },
          select: {
            id: true,
            name: true,
            series: {
              select: {
                manufacturer: {
                  select: {
                    name: true,
                    image: { select: { id: true, mimeType: true } },
                  },
                },
              },
            },
          },
        })
      : []
    ).map((variant) => [
      variant.id,
      {
        name: variant.name,
        manufacturerName: variant.series.manufacturer.name,
        logo: variant.series.manufacturer.image
          ? {
              src: `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${variant.series.manufacturer.image.id}`,
              mimeType: variant.series.manufacturer.image.mimeType,
            }
          : undefined,
      },
    ]),
  );

  /**
   * Pages this viewer can see, for rendering internal page links and the
   * "[[" suggestion. Invisible pages stay out so their titles never leak.
   */
  const linkablePages = Object.fromEntries(
    context.pages
      .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
      .map((candidate) => [
        candidate.id,
        {
          title: candidate.title,
          slug: candidate.slug,
          iconSrc: candidate.iconId
            ? `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${candidate.iconId}`
            : undefined,
        },
      ]),
  );

  /**
   * Page lists of the page-index nodes on this page, resolved for this
   * viewer — for the static render and as the editor node views' initial
   * data; the node views refetch so config changes show up without a
   * reload.
   */
  const pageIndexes = Object.fromEntries(
    await Promise.all(
      collectWikiPageIndexConfigs(pageContent?.content).map(
        async ({ key, config }) =>
          [key, await resolveWikiPageIndex(context, page.id, config)] as const,
      ),
    ),
  );

  /**
   * Members of the role-member nodes on this page, resolved for this viewer
   * — for the static render and as the editor node views' initial data; the
   * node views refetch so role changes show up without a reload.
   */
  const roleCitizens = Object.fromEntries(
    await Promise.all(
      collectWikiRoleCitizensRoleIds(pageContent?.content).map(
        async (roleId) =>
          [roleId, await resolveWikiRoleCitizens(roleId)] as const,
      ),
    ),
  );

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

  /**
   * Editing requires the collab server — without it (e.g. a preview
   * deployment missing the env vars) the wiki is read-only.
   */
  const collabUrl =
    env.COLLAB_JWT_SECRET && env.NEXT_PUBLIC_COLLAB_URL
      ? env.NEXT_PUBLIC_COLLAB_URL
      : null;

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
              <WikiPageExportImportModal pageId={page.id} title={page.title} />
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
          {collabUrl ? (
            <WikiCollabEditor
              key={page.id}
              pageId={page.id}
              collabUrl={collabUrl}
              canEdit={permissions.canEdit}
              canUploadImages={permissions.canUploadImages}
              canUploadAttachments={permissions.canUploadAttachments}
              userName={session?.entity?.handle ?? "Unbekannt"}
              userColor={getWikiCollabColor(
                session?.entity?.id ?? session?.user.id ?? page.id,
              )}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
              linkedVariants={linkedVariants}
              pageIndexes={pageIndexes}
              roleCitizens={roleCitizens}
              staticFallback={
                <WikiPageStaticContent
                  content={pageContent?.content}
                  pageId={page.id}
                  iframeAllowlist={iframeAllowlist}
                  linkablePages={linkablePages}
                  mentionedCitizens={mentionedCitizens}
                  linkedVariants={linkedVariants}
                  pageIndexes={pageIndexes}
                  roleCitizens={roleCitizens}
                />
              }
            />
          ) : (
            <WikiPageStaticContent
              content={pageContent?.content}
              pageId={page.id}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
              linkedVariants={linkedVariants}
              pageIndexes={pageIndexes}
              roleCitizens={roleCitizens}
            />
          )}
        </div>
      </article>
    </WikiEditModeProvider>
  );
};
