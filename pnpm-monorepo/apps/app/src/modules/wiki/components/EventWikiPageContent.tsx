import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  type EventWikiContext,
  type EventWikiContextPage,
} from "../queries/getEventWikiContext";
import { getEventWikiPageStaticContent } from "../queries/getEventWikiPageStaticContent";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { getWikiCollabColor } from "../utils/getWikiCollabColor";
import { trackWikiPageVisit } from "../utils/trackWikiPageVisit";
import { WikiCollabEditor } from "./WikiCollabEditor";
import { WikiEditModeProvider } from "./WikiEditModeProvider";
import { WikiEditModeToggle } from "./WikiEditModeToggle";
import { WikiPageFavoriteButton } from "./WikiPageFavoriteButton";
import { WikiPageIcon } from "./WikiPageIcon";
import { WikiPageStaticContent } from "./WikiPageStaticContent";

interface Props {
  readonly context: EventWikiContext;
  readonly page: EventWikiContextPage;
}

/**
 * An event wiki page: header, actions and content. Shared by the briefing
 * root route (which serves the locked root page) and the child page route.
 * Callers must have checked the viewer's read permission.
 */
export const EventWikiPageContent = async ({ context, page }: Props) => {
  const [staticContent, favoritePageIds, authentication] = await Promise.all([
    getEventWikiPageStaticContent(context, page.id),
    getWikiFavoritePageIds(),
    authenticate(),
  ]);

  const permissions = context.permissions.get(page.id);
  const session = authentication ? authentication.session : null;
  trackWikiPageVisit(session?.entity?.id ?? null, page.id);

  /**
   * Editing requires the collab server — without it (e.g. a preview
   * deployment missing the env vars) the briefing is read-only, like the
   * wiki.
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
              {page.iconId && <WikiPageIcon iconId={page.iconId} />}
              {page.title}
            </h1>

            <p className="mt-1 text-xs text-white/20">
              <span className="uppercase font-mono">Aktualisiert:</span>{" "}
              {formatDate(page.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {permissions?.canEdit && collabUrl && <WikiEditModeToggle />}

            <WikiPageFavoriteButton
              pageId={page.id}
              isFavorite={favoritePageIds.has(page.id)}
            />
          </div>
        </div>

        <div className="mt-4">
          {collabUrl ? (
            <WikiCollabEditor
              key={page.id}
              pageId={page.id}
              collabUrl={collabUrl}
              canEdit={permissions?.canEdit === true}
              canUploadImages={permissions?.canUploadImages === true}
              canUploadAttachments={permissions?.canUploadAttachments === true}
              userName={session?.entity?.handle ?? "Unbekannt"}
              userColor={getWikiCollabColor(
                session?.entity?.id ?? session?.user.id ?? page.id,
              )}
              iframeAllowlist={staticContent.iframeAllowlist}
              linkablePages={staticContent.linkablePages}
              mentionedCitizens={staticContent.mentionedCitizens}
              linkedVariants={staticContent.linkedVariants}
              pageIndexes={staticContent.pageIndexes}
              roleCitizens={staticContent.roleCitizens}
              staticFallback={
                <WikiPageStaticContent pageId={page.id} {...staticContent} />
              }
            />
          ) : (
            <WikiPageStaticContent pageId={page.id} {...staticContent} />
          )}
        </div>
      </article>
    </WikiEditModeProvider>
  );
};
