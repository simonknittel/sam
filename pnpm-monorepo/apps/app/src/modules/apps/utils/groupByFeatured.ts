import { getAppKey } from "./getAppKey";
import type { App } from "./types";

/**
 * The favorites group is an additional view on the same apps — `featured` and
 * `other` stay complete, so a favorited app shows up twice.
 */
export const groupByFeatured = (
  apps: App[] | null,
  favoriteAppKeys: ReadonlySet<string> = new Set(),
) => {
  const favorites = apps
    ?.filter((app) => {
      const appKey = getAppKey(app);
      return appKey ? favoriteAppKeys.has(appKey) : false;
    })
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const featured = apps
    ?.filter((app) => "tags" in app && app.tags?.includes("featured"))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const other = apps
    ?.filter((app) => !("tags" in app && app.tags?.includes("featured")))
    .toSorted((a, b) => a.name.localeCompare(b.name));

  return {
    favorites,
    featured,
    other,
  };
};
