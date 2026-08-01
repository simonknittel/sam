import { prisma } from "@/db";
import { env } from "@/env";
import { authenticate, requireAuthenticationPage } from "@/modules/auth/server";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
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
import { WikiPageEditor } from "@/modules/wiki/components/WikiPageEditor";
import { WikiPageExportImportModal } from "@/modules/wiki/components/WikiPageExportImportModal";
import { WikiPageFavoriteButton } from "@/modules/wiki/components/WikiPageFavoriteButton";
import { WikiPagePermissionsModal } from "@/modules/wiki/components/WikiPagePermissionsModal";
import { WikiPageSidebarModeModal } from "@/modules/wiki/components/WikiPageSidebarModeModal";
import { WikiPageStaticContent } from "@/modules/wiki/components/WikiPageStaticContent";
import { WikiPageTags } from "@/modules/wiki/components/WikiPageTags";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "@/modules/wiki/queries/getWikiContext";
import { getWikiFavoritePageIds } from "@/modules/wiki/queries/getWikiFavorites";
import { getWikiIframeAllowlist } from "@/modules/wiki/queries/getWikiSettings";
import { collectWikiPageDescendants } from "@/modules/wiki/utils/collectWikiPageDescendants";
import {
  getEditableWikiPageTargets,
  type WikiPageTargetOption,
} from "@/modules/wiki/utils/getEditableWikiPageTargets";
import { getWikiCollabColor } from "@/modules/wiki/utils/getWikiCollabColor";
import { resolveWikiPageIndex } from "@/modules/wiki/utils/resolveWikiPageIndex";
import { trackWikiPageVisit } from "@/modules/wiki/utils/trackWikiPageVisit";
import { WikiPageAccessType } from "@sam-monorepo/database/client";
import {
  collectWikiMentionedCitizenIds,
  collectWikiPageIndexConfigs,
} from "@sam-monorepo/wiki-editor";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FaHistory, FaSitemap } from "react-icons/fa";

type Params = PageProps<"/app/wiki/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { pageId } = await params;
  const context = await getWikiContext();
  if (!context) return null;

  const page = context.pagesById.get(pageId);
  if (!page || page.deletedAt) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions?.canRead) return null;

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
  const authentication = await requireAuthenticationPage("/app/wiki");
  await authentication.authorizePage("wiki", "read");

  const result = await getVisiblePage(props.params);
  /**
   * Invisible pages 404 instead of 403 to avoid leaking their existence.
   */
  if (!result) notFound();

  const { context, page, permissions } = result;

  const { slug } = await props.params;
  if (slug?.[0] !== page.slug) redirect(`/app/wiki/${page.id}/${page.slug}`);

  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
    >
      <SuspenseWithErrorBoundaryTile>
        <PageContent context={context} page={page} permissions={permissions} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
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
   * Pages this viewer can see, for rendering internal page links and the
   * "[[" suggestion. Invisible pages stay out so their titles never leak.
   */
  const linkablePages = Object.fromEntries(
    context.pages
      .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
      .map((candidate) => [
        candidate.id,
        { title: candidate.title, slug: candidate.slug },
      ]),
  );

  /**
   * Page lists of the page-index nodes on this page, resolved for this
   * viewer — for the static render; the editor node view fetches them
   * itself so config changes show up without a reload.
   */
  const pageIndexes = Object.fromEntries(
    await Promise.all(
      collectWikiPageIndexConfigs(pageContent?.content).map(
        async ({ key, config }) =>
          [key, await resolveWikiPageIndex(context, page.id, config)] as const,
      ),
    ),
  );

  const moveTargets: WikiPageTargetOption[] = permissions.canAdmin
    ? getEditableWikiPageTargets(context, page.id)
    : [];

  /**
   * Unlike moving, duplicating into the page's own subtree is fine — the
   * copy is a new page, so no cycle can occur.
   */
  const duplicateTargets = getEditableWikiPageTargets(context);

  const sourceTitle = (sourceId: string) =>
    sourceId === page.id ? undefined : context.pagesById.get(sourceId)?.title;

  const roleIdsOf = (type: WikiPageAccessType) =>
    page.roleAccess
      .filter((access) => access.type === type)
      .map((access) => access.roleId);

  const canCreateTopLevel = Boolean(
    authentication && (await authentication.authorize("wiki", "create")),
  );

  return (
    /**
     * Keyed by page so navigating to another page always starts back in
     * view mode.
     */
    <WikiEditModeProvider key={page.id}>
      <article className="bg-secondary rounded-primary p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="font-bold text-2xl">
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
            {permissions.canEdit && <WikiEditModeToggle />}

            <WikiPageFavoriteButton
              pageId={page.id}
              isFavorite={favoritePageIds.has(page.id)}
            />

            <ReportWikiPageModal pageId={page.id} title={page.title} />

            {(canCreateTopLevel || duplicateTargets.length > 0) && (
              <DuplicateWikiPageModal
                pageId={page.id}
                title={page.title}
                targets={duplicateTargets}
                allowTopLevel={canCreateTopLevel}
                currentParentId={page.parentId}
                hasDescendants={descendantIds.length > 0}
              />
            )}

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
                    adminability: page.adminability,
                  }}
                  effectiveOwnerHandle={effectiveOwner?.handle ?? null}
                  readRoleIds={roleIdsOf(WikiPageAccessType.READ)}
                  editRoleIds={roleIdsOf(WikiPageAccessType.EDIT)}
                  adminRoleIds={roleIdsOf(WikiPageAccessType.ADMIN)}
                  inheritedFrom={{
                    visibility: sourceTitle(permissions.visibilitySourceId),
                    editability: sourceTitle(permissions.editabilitySourceId),
                    adminability: sourceTitle(permissions.adminabilitySourceId),
                  }}
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
          className="mt-3"
          pageId={page.id}
          tags={pageTags.map((entry) => entry.tag)}
          canEdit={permissions.canEdit}
        />

        <div className="mt-4">
          {env.COLLAB_JWT_SECRET && env.NEXT_PUBLIC_COLLAB_URL ? (
            <WikiCollabEditor
              key={page.id}
              pageId={page.id}
              collabUrl={env.NEXT_PUBLIC_COLLAB_URL}
              canEdit={permissions.canEdit}
              userName={session?.entity?.handle ?? "Unbekannt"}
              userColor={getWikiCollabColor(
                session?.entity?.id ?? session?.user.id ?? page.id,
              )}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
              staticFallback={
                <WikiPageStaticContent
                  content={pageContent?.content}
                  iframeAllowlist={iframeAllowlist}
                  linkablePages={linkablePages}
                  mentionedCitizens={mentionedCitizens}
                  pageIndexes={pageIndexes}
                />
              }
            />
          ) : permissions.canEdit ? (
            <WikiPageEditor
              key={page.id}
              pageId={page.id}
              content={pageContent?.content}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
              pageIndexes={pageIndexes}
            />
          ) : (
            <WikiPageStaticContent
              content={pageContent?.content}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
              pageIndexes={pageIndexes}
            />
          )}
        </div>
      </article>
    </WikiEditModeProvider>
  );
};
