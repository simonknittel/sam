/**
 * Merges the dot badge counts of several sources. The counts of sources for
 * the same app add up.
 */
export const addCountsByAppSlug = (
  ...countsByAppSlug: readonly Readonly<Record<string, number>>[]
) => {
  const sums: Record<string, number> = {};

  for (const counts of countsByAppSlug)
    for (const [appSlug, count] of Object.entries(counts))
      sums[appSlug] = (sums[appSlug] ?? 0) + count;

  return sums;
};
