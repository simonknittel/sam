import type { WikiPageTargetOption } from "./getWikiPageTargets";

/**
 * The parent that the create form and the paste form select: the preferred
 * page while the pages still include it, else the top level (an empty
 * string) when it is allowed, else the first page.
 */
export const chooseWikiParentId = (
  targets: readonly WikiPageTargetOption[],
  allowTopLevel: boolean,
  preferredParentId?: string,
) => {
  if (
    preferredParentId &&
    targets.some((target) => target.id === preferredParentId)
  )
    return preferredParentId;
  if (allowTopLevel || targets.length === 0) return "";
  return targets[0].id;
};
