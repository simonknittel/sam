"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import type { App } from "../utils/types";

interface AppsContext {
  readonly apps: App[] | null;
  readonly appDotBadgeCounts: Record<string, number>;
  readonly adjustAppDotBadgeCount: (appSlug: string, delta: number) => void;
  readonly favoriteAppKeys: ReadonlySet<string>;
  readonly setAppFavorite: (appKey: string, isFavorite: boolean) => void;
}

const AppsContext = createContext<AppsContext | undefined>(undefined);

interface Props {
  readonly apps: App[] | null;
  readonly children: ReactNode;
  readonly appDotBadgeCounts?: Record<string, number>;
  readonly favoriteAppKeys?: string[];
}

export const AppsContextProvider = ({
  apps,
  children,
  appDotBadgeCounts: serverAppDotBadgeCounts = {},
  favoriteAppKeys: serverFavoriteAppKeys = [],
}: Props) => {
  /**
   * Apps whose badge counts down while the user works through its items (the
   * changelog marks entries seen as they scroll past) adjust the count here
   * instead of a `refresh()` of the whole app layout for a single number. Steps
   * aside whenever the server sends different counts, like the favorites do.
   */
  const serverCountsSignature = Object.entries(serverAppDotBadgeCounts)
    .toSorted(([firstSlug], [secondSlug]) =>
      firstSlug.localeCompare(secondSlug),
    )
    .map(([appSlug, count]) => `${appSlug}:${count}`)
    .join(",");
  const [appDotBadgeCounts, setAppDotBadgeCounts] = useState(
    serverAppDotBadgeCounts,
  );
  const [renderedCountsSignature, setRenderedCountsSignature] = useState(
    serverCountsSignature,
  );

  if (renderedCountsSignature !== serverCountsSignature) {
    setRenderedCountsSignature(serverCountsSignature);
    setAppDotBadgeCounts(serverAppDotBadgeCounts);
  }

  const adjustAppDotBadgeCount = (appSlug: string, delta: number) => {
    setAppDotBadgeCounts((previousCounts) => ({
      ...previousCounts,
      [appSlug]: Math.max(0, (previousCounts[appSlug] ?? 0) + delta),
    }));
  };

  /**
   * Toggling a favorite deliberately calls no `refresh()`, which would
   * re-render the whole shell underneath an open popover. The optimistic
   * state lives here instead and steps aside whenever the server sends a
   * different set, e.g. on the next navigation.
   */
  const serverKeySignature = serverFavoriteAppKeys.toSorted().join(",");
  const [favoriteAppKeys, setFavoriteAppKeys] = useState(
    () => new Set(serverFavoriteAppKeys),
  );
  const [renderedKeySignature, setRenderedKeySignature] =
    useState(serverKeySignature);

  if (renderedKeySignature !== serverKeySignature) {
    setRenderedKeySignature(serverKeySignature);
    setFavoriteAppKeys(new Set(serverFavoriteAppKeys));
  }

  const setAppFavorite = (appKey: string, isFavorite: boolean) => {
    setFavoriteAppKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      if (isFavorite) nextKeys.add(appKey);
      else nextKeys.delete(appKey);
      return nextKeys;
    });
  };

  const value = {
    apps,
    appDotBadgeCounts,
    adjustAppDotBadgeCount,
    favoriteAppKeys,
    setAppFavorite,
  };

  return <AppsContext value={value}>{children}</AppsContext>;
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useAppsContext() {
  const context = useContext(AppsContext);
  if (!context) throw new Error("[AppsContext] Provider is missing!");
  return context;
}
