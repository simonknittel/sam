import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import {
  getWikiContext,
  type WikiSharedContext,
  type WikiSharedContextPage,
} from "../queries/getWikiContext";
import { WikiPageIcon } from "./WikiPageIcon";
import { WikiTrashActions } from "./WikiTrashActions";

const COLUMNS = "minmax(200px,1fr) 140px 300px";

const loadSearchParams = createLoader({
  sort: parseAsStringLiteral(["deleted-desc", "deleted-asc"]).withDefault(
    "deleted-desc",
  ),
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
  /**
   * Context whose trash to show, e.g. an event wiki's; defaults to the
   * global wiki
   */
  readonly context?: WikiSharedContext & {
    readonly allPages: WikiSharedContextPage[];
  };
  /** Restore/destroy are mutations — frozen events only view their trash */
  readonly canRestore?: boolean;
}

export const WikiTrashTable = async ({
  className,
  searchParams,
  context: givenContext,
  canRestore = true,
}: Props) => {
  const { sort, q } = await loadSearchParams(searchParams);

  const context = givenContext ?? (await getWikiContext());
  if (!context) forbidden();

  /**
   * Only pages the viewer can administrate show up in their trash. Child
   * pages of a deleted subtree are hidden — restoring/destroying the
   * subtree root covers them.
   */
  const trashedPages = context.allPages.filter((page) => {
    if (page.deletedAt === null) return false;
    if (!context.permissions.get(page.id)?.canAdmin) return false;
    const parent = page.parentId
      ? context.pagesById.get(page.parentId)
      : undefined;
    return !parent?.deletedAt;
  });

  const filteredPages = trashedPages.filter((page) => {
    if (!q) return true;
    return page.title.toLowerCase().includes(q.toLowerCase());
  });

  const sortedPages = filteredPages.toSorted((a, b) => {
    switch (sort) {
      case "deleted-desc":
        return b.deletedAt!.getTime() - a.deletedAt!.getTime();
      case "deleted-asc":
        return a.deletedAt!.getTime() - b.deletedAt!.getTime();
      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <p className="mb-4 text-sm text-neutral-400">
        Gelöschte Seiten werden nach 30 Tagen endgültig entfernt.
      </p>

      <Table columns={COLUMNS} minWidth={640}>
        <THead>
          <th>Seite</th>

          <th>Gelöscht am</th>

          <th className="sr-only">Aktionen</th>
        </THead>

        <TBody>
          {sortedPages.map((page) => (
            <TrashRow key={page.id} page={page} canRestore={canRestore} />
          ))}
        </TBody>
      </Table>

      {sortedPages.length <= 0 && (
        <p className="text-neutral-500 italic">Der Papierkorb ist leer</p>
      )}
    </section>
  );
};

interface TrashRowProps {
  readonly page: WikiSharedContextPage;
  readonly canRestore: boolean;
}

const TrashRow = ({ page, canRestore }: TrashRowProps) => {
  return (
    <TRow className="h-10">
      <td className="overflow-hidden">
        <p
          className="flex items-center gap-2 px-2 font-bold"
          title={page.title}
        >
          {page.iconId && <WikiPageIcon iconId={page.iconId} />}
          <span className="truncate">{page.title}</span>
        </p>
      </td>

      <td>{formatDate(page.deletedAt)}</td>

      <td>
        {canRestore && (
          <WikiTrashActions
            pageId={page.id}
            title={page.title}
            className="flex flex-wrap items-center gap-2"
          />
        )}
      </td>
    </TRow>
  );
};
