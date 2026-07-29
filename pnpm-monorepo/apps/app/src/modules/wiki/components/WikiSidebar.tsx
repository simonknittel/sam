import { Link } from "@/modules/common/components/Link";
import { FaStar } from "react-icons/fa";
import {
  getWikiContext,
  type WikiContextPage,
} from "../queries/getWikiContext";
import { getWikiFavoritePageIds } from "../queries/getWikiFavorites";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { WikiPageTree } from "./WikiPageTree";
import { WikiSearch } from "./WikiSearch";

export const WikiSidebar = async () => {
  const context = await getWikiContext();
  if (!context) return null;

  const favoriteIds = await getWikiFavoritePageIds();
  const favorites = context.pages
    .filter(
      (page) =>
        favoriteIds.has(page.id) && context.permissions.get(page.id)?.canRead,
    )
    .toSorted((a, b) => a.title.localeCompare(b.title));

  const tree = buildVisibleWikiTree(context.pages, context.permissions);

  return (
    <>
      <div className="bg-secondary p-4 corners-secondary flex flex-col gap-4">
        <WikiSearch compact />
      </div>

      <div className="bg-secondary px-2 py-4 corners-secondary flex flex-col gap-4">
        <Favorites pages={favorites} />
      </div>

      <div className="bg-secondary px-2 py-4 corners-secondary flex flex-col gap-4">
        <p className="px-2 text-sm text-white/40 font-mono uppercase">
          Inhaltsverzeichnis
        </p>

        {tree.length > 0 ? (
          <WikiPageTree nodes={tree} />
        ) : (
          <p className="text-sm text-neutral-400">Keine Seiten vorhanden.</p>
        )}
      </div>
    </>
  );
};

interface FavoritesProps {
  readonly pages: WikiContextPage[];
}

const Favorites = ({ pages }: FavoritesProps) => {
  return (
    <div>
      <p className="px-2 text-sm text-white/40 font-mono uppercase">
        Favoriten
      </p>

      {pages.length > 0 ? (
        <ul className="mt-1 flex flex-col">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/app/wiki/${page.id}/${page.slug}`}
                className="flex items-center gap-2 rounded-secondary px-2 py-1 text-neutral-300 hover:text-interaction-300"
                title={page.title}
              >
                <FaStar className="size-3 flex-none text-amber-400" />
                <span className="truncate">{page.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-white/20 px-2 mt-1 italic">
          Du hast bisher keine Favoriten.
        </p>
      )}
    </div>
  );
};
