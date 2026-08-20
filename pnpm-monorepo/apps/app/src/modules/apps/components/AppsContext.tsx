"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { App } from "../utils/types";

interface AppsContext {
  readonly apps: App[] | null;
  readonly appDotBadgeCounts: Record<string, number>;
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
  appDotBadgeCounts = {},
  favoriteAppKeys: serverFavoriteAppKeys = [],
}: Props) => {
  /**
   * Toggling a favorite deliberately doesn't revalidate the layout, which
   * would re-render the whole shell underneath an open popover. The optimistic
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

  const setAppFavorite = useCallback((appKey: string, isFavorite: boolean) => {
    setFavoriteAppKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      if (isFavorite) nextKeys.add(appKey);
      else nextKeys.delete(appKey);
      return nextKeys;
    });
  }, []);

  const value = useMemo(
    () => ({
      apps,
      appDotBadgeCounts,
      favoriteAppKeys,
      setAppFavorite,
    }),
    [apps, appDotBadgeCounts, favoriteAppKeys, setAppFavorite],
  );

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
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
