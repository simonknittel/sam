import { authenticate } from "@/modules/auth/server";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  type EventWikiContext,
  type EventWikiContextPage,
} from "../queries/getEventWikiContext";
import { getEventWikiPageStaticContent } from "../queries/getEventWikiPageStaticContent";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { trackWikiPageVisit } from "../utils/trackWikiPageVisit";
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

  const session = authentication ? authentication.session : null;
  trackWikiPageVisit(session?.entity?.id ?? null, page.id);

  return (
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
          <WikiPageFavoriteButton
            pageId={page.id}
            isFavorite={favoritePageIds.has(page.id)}
          />
        </div>
      </div>

      <div className="mt-4">
        <WikiPageStaticContent pageId={page.id} {...staticContent} />
      </div>
    </article>
  );
};
