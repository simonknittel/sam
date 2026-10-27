import { useState } from "react";

/** The same ids in a different order give the same signature */
const toSignature = (ids: readonly string[]) => ids.toSorted().join(",");

/**
 * The selection of a form that saves the changes of a list of links, not the
 * full list. The changes compare the selection with the saved ids that the
 * page loaded, thus a save does not remove a link that a different user
 * added after the load. When the saved ids change (after a save or a
 * refresh), the selection takes them and keeps the changes that are not
 * saved yet.
 */
export const useSelectionChanges = (savedIds: readonly string[]) => {
  const [loadedIds, setLoadedIds] = useState(savedIds);
  const [selectedIds, setSelectedIds] = useState(savedIds);

  const addedIds = selectedIds.filter((id) => !loadedIds.includes(id));
  const removedIds = loadedIds.filter((id) => !selectedIds.includes(id));

  if (toSignature(loadedIds) !== toSignature(savedIds)) {
    setLoadedIds(savedIds);
    setSelectedIds([
      ...savedIds.filter((id) => !removedIds.includes(id)),
      ...addedIds.filter((id) => !savedIds.includes(id)),
    ]);
  }

  return { selectedIds, setSelectedIds, addedIds, removedIds };
};
