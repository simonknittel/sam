import type { WikiPageTargetOption } from "./getWikiPageTargets";

/** An empty string is the top level */
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
