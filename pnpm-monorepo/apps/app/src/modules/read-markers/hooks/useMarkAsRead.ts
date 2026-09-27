"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useOptimistic, useTransition } from "react";
import { markAsRead } from "../actions/markAsRead";

/**
 * The "new" state of an item for its row or card, plus the click handler of
 * its `<NewMarkerButton>`. The highlight disappears at once; the action
 * revalidates the app, thus the server state (lists, tiles, dot badges)
 * follows in the same transition. A failure restores the highlight.
 */
export const useMarkAsRead = (
  subject: ReadMarkerSubject,
  subjectId: string,
  isNewOnServer: boolean,
) => {
  const [isNew, setIsNew] = useOptimistic(isNewOnServer);
  const [, startTransition] = useTransition();

  const markItemAsRead = () => {
    startTransition(async () => {
      setIsNew(false);

      const formData = new FormData();
      formData.set("subject", subject);
      formData.set("subjectId", subjectId);
      await runAction(markAsRead, formData, { successToast: false });
    });
  };

  return { isNew, markAsRead: markItemAsRead };
};
