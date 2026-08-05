import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { WikiContextPage } from "../queries/getWikiContext";
import { WikiPageIcon } from "./WikiPageIcon";

const ICON_SIZE_IN_PIXELS = 32;

interface Props {
  /** Already filtered to the pages the viewer may read */
  readonly pages: readonly WikiContextPage[];
}

/**
 * The pages the wiki admins highlight on the landing page, in the order
 * they arranged them in the wiki settings.
 */
export const WikiFeaturedPages = ({ pages }: Props) => {
  return (
    <section className="bg-secondary rounded-primary p-4">
      <h2 className="font-mono uppercase font-bold text-xl">Featured</h2>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <WikiFeaturedPageCard key={page.id} page={page} />
        ))}
      </ul>
    </section>
  );
};

interface CardProps {
  readonly page: WikiContextPage;
}

const WikiFeaturedPageCard = ({ page }: CardProps) => {
  return (
    <li>
      <Link
        href={`/app/wiki/${page.id}/${page.slug}`}
        className="group flex h-full flex-col gap-2 rounded-secondary border border-neutral-800 p-4 hover:border-neutral-600 hover:bg-neutral-800 focus-visible:outline-2 outline-offset-2 outline-interaction-700 active:bg-neutral-700"
      >
        {page.iconId && (
          <WikiPageIcon
            iconId={page.iconId}
            size={ICON_SIZE_IN_PIXELS}
            className="size-8"
          />
        )}

        <span
          className="line-clamp-2 font-bold text-interaction-500 group-hover:text-interaction-300 group-focus-visible:text-interaction-300"
          title={page.title}
        >
          {page.title}
        </span>

        <span className="mt-auto text-xs text-neutral-500">
          <span className="uppercase font-mono">Aktualisiert:</span>{" "}
          {formatDate(page.updatedAt)}
        </span>
      </Link>
    </li>
  );
};
