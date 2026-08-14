import { Link } from "@/modules/common/components/Link";
import { FaStar } from "react-icons/fa";
import { WikiPageIcon } from "./WikiPageIcon";

interface WikiSidebarFavoritePage {
  readonly id: string;
  readonly title: string;
  readonly iconId: string | null;
  readonly href: string;
}

interface Props {
  readonly pages: WikiSidebarFavoritePage[];
}

/** The sidebar's "Favoriten" section, shared by the global and event wikis */
export const WikiSidebarFavorites = ({ pages }: Props) => {
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
                href={page.href}
                // Like the tree's links, deliberately not prefetched — every
                // prefetch is a full server render of the target page
                prefetch={false}
                className="flex items-center gap-2 rounded-secondary px-2 py-1 text-neutral-300 hover:text-interaction-300"
                title={page.title}
              >
                {page.iconId ? (
                  <WikiPageIcon iconId={page.iconId} />
                ) : (
                  <FaStar className="size-3 flex-none text-amber-400" />
                )}
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
