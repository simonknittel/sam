"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { markAsRead } from "../actions/markAsRead";

/**
 * The "new" state of an item for its row or card, plus the click handler of
 * its `<NewMarkerButton>`. The highlight disappears at once; the action
 * refreshes the app, thus the server state (lists, tiles, dot badges)
 * follows in the same transition. A failure restores the highlight.
 */
export const useMarkAsRead = (
  subject: ReadMarkerSubject,
  subjectId: string,
  isNewOnServer: boolean,
) => {
  /**
   * The action refreshes the server state only when the item was new for
   * it — not when another tab read it first, or when it closed in the
   * meantime. A marker never goes away, thus the highlight stays hidden.
   */
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);
  const [isNew, setIsNew] = useOptimistic(isNewOnServer && !isMarkedAsRead);
  const [, startTransition] = useTransition();
  /** Attach to the link of the item: it takes the focus of the marker */
  const focusTargetRef = useRef<HTMLAnchorElement>(null);

  const markItemAsRead = () => {
    // The marker disappears, thus the focus would fall back to the page
    focusTargetRef.current?.focus();

    startTransition(async () => {
      setIsNew(false);

      const formData = new FormData();
      formData.set("subject", subject);
      formData.set("subjectId", subjectId);
      if (await runAction(markAsRead, formData, { successToast: false }))
        setIsMarkedAsRead(true);
    });
  };

  return { isNew, markAsRead: markItemAsRead, focusTargetRef };
};
