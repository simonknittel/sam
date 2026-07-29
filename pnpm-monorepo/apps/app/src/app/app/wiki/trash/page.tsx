import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { WikiTrashActions } from "@/modules/wiki/components/WikiTrashActions";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { forbidden } from "next/navigation";

export const metadata = {
  title: "Papierkorb",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/wiki/trash");
  await authentication.authorizePage("wiki", "read");

  return (
    <SuspenseWithErrorBoundaryTile>
      <Trash />
    </SuspenseWithErrorBoundaryTile>
  );
}

const Trash = async () => {
  const context = await getWikiContext();
  if (!context) forbidden();

  /**
   * Only pages the viewer can administrate show up in their trash. Child
   * pages of a deleted subtree are hidden — restoring/destroying the
   * subtree root covers them.
   */
  const trashedPages = context.allPages
    .filter((page) => {
      if (page.deletedAt === null) return false;
      if (!context.permissions.get(page.id)?.canAdmin) return false;
      const parent = page.parentId
        ? context.pagesById.get(page.parentId)
        : undefined;
      return !parent || parent.deletedAt === null;
    })
    .toSorted((a, b) => b.deletedAt!.getTime() - a.deletedAt!.getTime());

  return (
    <section className="bg-secondary rounded-primary p-4 lg:p-8">
      <h1 className="font-bold text-xl">Papierkorb</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Gelöschte Seiten werden nach 30 Tagen endgültig entfernt.
      </p>

      {trashedPages.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-800">
          {trashedPages.map((page) => (
            <li
              key={page.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span>
                {page.title}
                <span className="ml-2 text-sm text-neutral-500">
                  gelöscht am {formatDate(page.deletedAt)}
                </span>
              </span>

              <WikiTrashActions pageId={page.id} title={page.title} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-neutral-400">Der Papierkorb ist leer.</p>
      )}
    </section>
  );
};
