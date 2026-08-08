import { Link } from "@/modules/common/components/Link";
import { FaTag } from "react-icons/fa";
import { WikiPageIcon } from "./WikiPageIcon";

interface TagPageEntry {
  readonly href: string;
  readonly title: string;
  readonly iconId: string | null;
  readonly breadcrumb: readonly string[];
}

interface Props {
  readonly tagName: string;
  readonly pages: readonly TagPageEntry[];
}

/**
 * Shared render body of the tag routes: the global wiki's and the event
 * briefing's tag pages differ only in how they gate and link their pages,
 * so both compute the visible page list and hand it here.
 */
export const WikiTagPageContent = ({ tagName, pages }: Props) => {
  return (
    <section className="bg-secondary rounded-primary p-4">
      <h1 className="flex items-center gap-3 font-bold text-2xl">
        <FaTag className="flex-none text-neutral-500" />
        {tagName}
      </h1>

      <p className="mt-1 text-xs text-white/20">
        <span className="uppercase font-mono">Seiten mit diesem Tag:</span>{" "}
        {pages.length}
      </p>

      {pages.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {pages.map((page) => (
            <TagPageListItem key={page.href} page={page} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-neutral-400">
          Keine sichtbaren Seiten mit diesem Tag.
        </p>
      )}
    </section>
  );
};

interface TagPageListItemProps {
  readonly page: TagPageEntry;
}

const TagPageListItem = ({ page }: TagPageListItemProps) => {
  return (
    <li>
      {page.breadcrumb.length > 0 && (
        <p
          className="text-xs text-neutral-500 truncate"
          title={page.breadcrumb.join(" / ")}
        >
          {page.breadcrumb.join(" / ")}
        </p>
      )}

      <Link
        href={page.href}
        className="inline-flex items-center gap-2 text-interaction-500 hover:text-interaction-300"
      >
        {page.iconId && <WikiPageIcon iconId={page.iconId} />}
        {page.title}
      </Link>
    </li>
  );
};
