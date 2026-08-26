"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useAppsContext } from "@/modules/apps/components/AppsContext";
import {
  useReadOnView,
  type ReadOnViewRef,
} from "@/modules/common/utils/useReadOnView";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { markChangelogEntriesSeen } from "../actions/markChangelogEntriesSeen";
import { CHANGELOG_APP_SLUG } from "../utils/CHANGELOG_APP_SLUG";

interface UnseenEntriesContext {
  /**
   * Entries which keep their "Neu" indicator although they are already
   * marked as seen.
   */
  readonly retainedHighlightKeys: ReadonlySet<string>;
  readonly observeEntry: ReadOnViewRef;
}

const UnseenEntriesContext = createContext<UnseenEntriesContext | undefined>(
  undefined,
);

interface Props {
  readonly children: ReactNode;
}

/**
 * Marks a tracked changelog entry as seen once it has dwelled in the
 * viewport, and lowers the dot badge of the app accordingly. The entries stay
 * highlighted for as long as this provider is mounted, so the user doesn't
 * lose track of what is new while they are still reading — leaving the
 * changelog unmounts it and the next visit renders them without a highlight.
 */
export const UnseenEntriesProvider = ({ children }: Props) => {
  const [retainedHighlightKeys, setRetainedHighlightKeys] = useState<
    ReadonlySet<string>
  >(new Set());
  const { adjustAppDotBadgeCount } = useAppsContext();

  const markSeen = useCallback(
    async (keys: string[]) => {
      const formData = new FormData();
      for (const key of keys) {
        formData.append("key", key);
      }

      const succeeded = await runAction(markChangelogEntriesSeen, formData, {
        successToast: false,
      });
      if (!succeeded) return;

      adjustAppDotBadgeCount(CHANGELOG_APP_SLUG, -keys.length);
    },
    [adjustAppDotBadgeCount],
  );

  const handleRead = useCallback(
    (keys: string[]) => {
      setRetainedHighlightKeys(
        (previousKeys) => new Set([...previousKeys, ...keys]),
      );
      void markSeen(keys);
    },
    [markSeen],
  );

  const observeEntry = useReadOnView({ onRead: handleRead });

  const value = useMemo(
    () => ({ retainedHighlightKeys, observeEntry }),
    [retainedHighlightKeys, observeEntry],
  );

  return (
    <UnseenEntriesContext.Provider value={value}>
      {children}
    </UnseenEntriesContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useUnseenEntries() {
  const context = useContext(UnseenEntriesContext);
  if (!context) throw new Error("[UnseenEntriesContext] Provider is missing!");
  return context;
}
