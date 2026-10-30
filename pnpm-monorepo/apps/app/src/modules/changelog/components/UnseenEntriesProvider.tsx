"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import {
  useReadOnView,
  type ReadOnViewRef,
} from "@/modules/common/utils/useReadOnView";
import { markItemsAsRead } from "@/modules/read-markers/actions/markItemsAsRead";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface UnseenEntriesContext {
  /**
   * Entries which keep their "Neu" indicator although they are already
   * read.
   */
  readonly retainedHighlightKeys: ReadonlySet<string>;
  readonly observeEntry: ReadOnViewRef;
  /**
   * Removes the "Neu" indicator of an entry for as long as the provider is
   * mounted, after a click on its marker. Mark the entry as read separately.
   */
  readonly dismissHighlight: (key: string) => void;
}

const UnseenEntriesContext = createContext<UnseenEntriesContext | undefined>(
  undefined,
);

interface Props {
  readonly children: ReactNode;
}

/**
 * Marks a tracked changelog entry as read once it has dwelled in the
 * viewport. The router then refreshes the page, thus the dot badge of the
 * app drops. The entries stay highlighted for as long as this provider is
 * mounted, so the user doesn't lose track of what is new while they are still
 * reading — leaving the changelog unmounts it and the next visit renders them
 * without a highlight. A click on the "Neu" marker of an entry removes its
 * highlight at once.
 */
export const UnseenEntriesProvider = ({ children }: Props) => {
  const [retainedHighlightKeys, setRetainedHighlightKeys] = useState<
    ReadonlySet<string>
  >(new Set());
  /**
   * An entry can be in the current read-on-view batch when the user clicks
   * its marker. The report of the batch must not bring the highlight back.
   */
  const dismissedHighlightKeys = useRef(new Set<string>());
  const router = useRouter();

  const markSeen = async (keys: string[]) => {
    const formData = new FormData();
    formData.set("subject", ReadMarkerSubject.ChangelogEntry);
    for (const key of keys) {
      formData.append("subjectId", key);
    }

    const response = await runAction(markItemsAsRead, formData, {
      successToast: false,
    });
    if (response?.newItemsRead) router.refresh();
  };

  const handleRead = (keys: string[]) => {
    const keysToRetain = keys.filter(
      (key) => !dismissedHighlightKeys.current.has(key),
    );
    setRetainedHighlightKeys(
      (previousKeys) => new Set([...previousKeys, ...keysToRetain]),
    );
    void markSeen(keys);
  };

  const dismissHighlight = (key: string) => {
    dismissedHighlightKeys.current.add(key);
    setRetainedHighlightKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      nextKeys.delete(key);
      return nextKeys;
    });
  };

  const observeEntry = useReadOnView({ onRead: handleRead });

  const value = { retainedHighlightKeys, observeEntry, dismissHighlight };

  return <UnseenEntriesContext value={value}>{children}</UnseenEntriesContext>;
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
