import { Link } from "@/modules/common/components/Link";
import { FaChevronRight } from "react-icons/fa";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import {
  buildWikiPageHref,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import { WikiPageIcon } from "./WikiPageIcon";

type Ancestor = Pick<WikiSharedContextPage, "id" | "slug" | "title" | "iconId">;

interface Props {
  readonly hrefMode: WikiPageHrefMode;
  /** From the top down to the direct parent */
  readonly ancestors: readonly Ancestor[];
}

/**
 * The links to the ancestors of a page, above its heading. A page without
 * an ancestor in the scope (a top-level page, the root page of a briefing
 * or of a variant embed) shows nothing.
 */
export const WikiPageBreadcrumbs = ({ hrefMode, ancestors }: Props) => {
  if (ancestors.length === 0) return null;

  return (
    <nav aria-label="Übergeordnete Seiten" className="mb-2 text-xs">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {ancestors.map((ancestor, index) => (
          <WikiPageBreadcrumb
            key={ancestor.id}
            href={buildWikiPageHref(hrefMode, ancestor)}
            ancestor={ancestor}
            isFirst={index === 0}
          />
        ))}
      </ol>
    </nav>
  );
};

interface WikiPageBreadcrumbProps {
  readonly href: string;
  readonly ancestor: Ancestor;
  readonly isFirst: boolean;
}

const WikiPageBreadcrumb = ({
  href,
  ancestor,
  isFirst,
}: WikiPageBreadcrumbProps) => {
  return (
    <li className="flex min-w-0 items-center gap-2">
      {!isFirst && (
        <FaChevronRight
          className="flex-none text-[0.5rem] text-neutral-600"
          aria-hidden
        />
      )}

      <Link
        href={href}
        className="inline-flex min-w-0 items-center gap-1.5 wrap-anywhere text-neutral-400 hover:text-interaction-500 focus-visible:text-interaction-500 active:text-interaction-300"
      >
        {ancestor.iconId && (
          <WikiPageIcon iconId={ancestor.iconId} className="size-3" size={12} />
        )}
        {ancestor.title}
      </Link>
    </li>
  );
};
