import type { SharingOwner } from "@sam-monorepo/application";
import {
  getLogAnalyzerHistoryEnd,
  isInVisibleTimeRange,
} from "@sam-monorepo/domain";
import type { IEntry } from "./PATTERNS";

/**
 * The entries for the Live-Status: the history of a citizen without a valid
 * grant is not live (decision 31 of `docs/remote-control-program/README.md`).
 * A newer entry of a different citizen always came through a grant.
 */
export const createLiveEntryFilter = (
  sharingOwners: readonly SharingOwner[],
) => {
  const historyEnd = getLogAnalyzerHistoryEnd(new Date());
  const visibleTimeRangeByCitizenId = new Map(
    sharingOwners.map(({ citizen, visibleTimeRange }) => [
      citizen.id,
      visibleTimeRange,
    ]),
  );

  return (entry: IEntry) => {
    if (!entry.isShared || entry.isoDate >= historyEnd) return true;

    const visibleTimeRange = visibleTimeRangeByCitizenId.get(entry.citizen.id);
    return (
      visibleTimeRange !== undefined &&
      isInVisibleTimeRange(visibleTimeRange, entry.isoDate)
    );
  };
};
