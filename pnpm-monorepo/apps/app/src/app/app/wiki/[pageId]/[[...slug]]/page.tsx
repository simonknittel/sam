import { prisma } from "@/db";
import { env } from "@/env";
import { authenticate, requireAuthenticationPage } from "@/modules/auth/server";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { Link } from "@/modules/common/components/Link";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { renameWikiPage } from "@/modules/wiki/actions/renameWikiPage";
import { DeleteWikiPageModal } from "@/modules/wiki/components/DeleteWikiPageModal";
import { ImportWikiPageContentModal } from "@/modules/wiki/components/ImportWikiPageContentModal";
import { MoveWikiPageModal } from "@/modules/wiki/components/MoveWikiPageModal";
import { ReportWikiPageModal } from "@/modules/wiki/components/ReportWikiPageModal";
import { WikiCollabEditor } from "@/modules/wiki/components/WikiCollabEditor";
import { WikiPageEditor } from "@/modules/wiki/components/WikiPageEditor";
import { WikiPageFavoriteButton } from "@/modules/wiki/components/WikiPageFavoriteButton";
import { WikiPagePermissionsModal } from "@/modules/wiki/components/WikiPagePermissionsModal";
import { WikiPageStaticContent } from "@/modules/wiki/components/WikiPageStaticContent";
import { WikiPageToc } from "@/modules/wiki/components/WikiPageToc";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "@/modules/wiki/queries/getWikiContext";
import { getWikiFavoritePageIds } from "@/modules/wiki/queries/getWikiFavorites";
import { getWikiIframeAllowlist } from "@/modules/wiki/queries/getWikiSettings";
import { buildWikiPageToc } from "@/modules/wiki/utils/buildWikiPageToc";
import { collectWikiPageDescendants } from "@/modules/wiki/utils/collectWikiPageDescendants";
import {
  getEditableWikiPageTargets,
  type WikiPageTargetOption,
} from "@/modules/wiki/utils/getEditableWikiPageTargets";
import { getWikiCollabColor } from "@/modules/wiki/utils/getWikiCollabColor";
import { trackWikiPageVisit } from "@/modules/wiki/utils/trackWikiPageVisit";
import { WikiPageAccessType } from "@sam-monorepo/database/client";
import { collectWikiMentionedCitizenIds } from "@sam-monorepo/wiki-editor";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FaFileExport, FaHistory, FaSitemap } from "react-icons/fa";

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
  const [effectiveOwner, pageContent, iframeAllowlist, favoritePageIds] =
    await Promise.all([
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

  const moveTargets: WikiPageTargetOption[] = permissions.canAdmin
    ? getEditableWikiPageTargets(context, page.id)
    : [];

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
    <article className="bg-secondary rounded-primary p-4">
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
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <WikiPageFavoriteButton
          pageId={page.id}
          isFavorite={favoritePageIds.has(page.id)}
        />
        <ReportWikiPageModal pageId={page.id} title={page.title} />

        {permissions.canAdmin && (
          <>
            <Button2
              as={Link}
              href={`/app/wiki/${page.id}/snapshots`}
              variant={Button2Variant.Secondary}
              title="Snapshots"
            >
              <FaHistory />
            </Button2>
            <MoveWikiPageModal
              pageId={page.id}
              targets={moveTargets}
              allowTopLevel={canCreateTopLevel}
              currentParentId={page.parentId}
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
          <>
            <Button2
              as="a"
              href={`/api/wiki/${page.id}/export`}
              variant={Button2Variant.Secondary}
              title="JSON exportieren"
            >
              <FaFileExport />
            </Button2>
            <ImportWikiPageContentModal pageId={page.id} title={page.title} />
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-8 xl:flex-row-reverse">
        {!permissions.canEdit && (
          <WikiPageToc
            entries={buildWikiPageToc(pageContent?.content)}
            className="xl:w-64 xl:flex-none self-start xl:sticky xl:top-4"
          />
        )}

        <div className="min-w-0 flex-1">
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
            />
          ) : (
            <WikiPageStaticContent
              content={pageContent?.content}
              iframeAllowlist={iframeAllowlist}
              linkablePages={linkablePages}
              mentionedCitizens={mentionedCitizens}
            />
          )}
        </div>
      </div>
    </article>
  );
};
