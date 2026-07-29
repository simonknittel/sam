import { getWikiContext } from "../queries/getWikiContext";
import { buildVisibleWikiTree } from "../utils/buildVisibleWikiTree";
import { WikiPageTree } from "./WikiPageTree";

export const WikiSidebar = async () => {
  const context = await getWikiContext();
  if (!context) return null;

  const tree = buildVisibleWikiTree(context.pages, context.permissions);

  return (
    <div className="bg-secondary px-2 py-4 corners-secondary">
      {tree.length > 0 ? (
        <WikiPageTree nodes={tree} />
      ) : (
        <p className="text-sm text-neutral-400">Keine Seiten vorhanden.</p>
      )}
    </div>
  );
};
