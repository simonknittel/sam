import { Link } from "@/modules/common/components/Link";
import type { CSSProperties } from "react";
import { WikiPageIcon } from "./WikiPageIcon";

export interface WikiPageIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  /** Scope-aware link from resolveWikiPageIndex; absent in legacy data */
  readonly href?: string;
  readonly children: readonly WikiPageIndexEntry[];
}

interface Props {
  readonly entries: readonly WikiPageIndexEntry[];
  readonly isLoading?: boolean;
  /** The node's width/position styles in the static render (wikiBlockLayoutStyle) */
  readonly style?: CSSProperties;
}

/**
 * The rendered page index ("Seitenverzeichnis"): a nested list of page
 * links. Shared between the static render for readers and the editor node
 * view so both look the same. The entries are resolved and
 * permission-filtered server-side — different viewers may see different
 * lists.
 */
export const WikiPageIndexList = ({
  entries,
  isLoading = false,
  style,
}: Props) => {
  return (
    <div data-wiki-page-index="" style={style}>
      <p className="text-xs text-white/40 font-mono uppercase my-0!">
        Seitenverzeichnis
      </p>

      {entries.length > 0 ? (
        <EntryList entries={entries} />
      ) : (
        <p className="text-sm text-neutral-400 my-1">
          {isLoading ? "Seiten werden geladen …" : "Keine Seiten"}
        </p>
      )}
    </div>
  );
};

interface EntryListProps {
  readonly entries: readonly WikiPageIndexEntry[];
}

const EntryList = ({ entries }: EntryListProps) => {
  return (
    <ul className="my-0!">
      {entries.map((entry) => (
        <li key={entry.id} className="my-0">
          <Link
            href={entry.href ?? `/app/wiki/${entry.id}/${entry.slug}`}
            className="inline-flex items-center gap-2 text-interaction-500 hover:text-interaction-300 no-underline hover:underline"
            title={entry.title}
          >
            {entry.iconId && (
              <WikiPageIcon iconId={entry.iconId} className="size-4 my-0!" />
            )}
            {entry.title}
          </Link>

          {entry.children.length > 0 && <EntryList entries={entry.children} />}
        </li>
      ))}
    </ul>
  );
};
