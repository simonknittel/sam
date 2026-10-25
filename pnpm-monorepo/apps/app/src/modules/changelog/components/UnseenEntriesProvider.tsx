"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import {
  useReadOnView,
  type ReadOnViewRef,
} from "@/modules/common/utils/useReadOnView";
import { markItemsAsRead } from "@/modules/read-markers/actions/markItemsAsRead";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

interface UnseenEntriesContext {
  /**
   * Entries which keep their "Neu" indicator although they are already
   * read.
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
 * Marks a tracked changelog entry as read once it has dwelled in the
 * viewport. The router then refreshes the page, thus the dot badge of the
 * app drops. The entries stay highlighted for as long as this provider is
 * mounted, so the user doesn't lose track of what is new while they are still
 * reading — leaving the changelog unmounts it and the next visit renders them
 * without a highlight.
 */
export const UnseenEntriesProvider = ({ children }: Props) => {
  const [retainedHighlightKeys, setRetainedHighlightKeys] = useState<
    ReadonlySet<string>
  >(new Set());
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
    setRetainedHighlightKeys(
      (previousKeys) => new Set([...previousKeys, ...keys]),
    );
    void markSeen(keys);
  };

  const observeEntry = useReadOnView({ onRead: handleRead });

  const value = { retainedHighlightKeys, observeEntry };

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
