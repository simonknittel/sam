"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useRefetchOnSiteNotifications } from "@/modules/notifications/hooks/useRefetchOnSiteNotifications";
import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { markAsRead } from "../actions/markAsRead";

/**
 * The highlight disappears at once. The action refreshes the app, thus the
 * server state follows in the same transition.
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
  const refetchOnSiteNotifications = useRefetchOnSiteNotifications();
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
      const response = await runAction(markAsRead, formData, {
        successToast: false,
      });
      if (!response) return;

      setIsMarkedAsRead(true);
      if (response.notificationsRead) refetchOnSiteNotifications();
    });
  };

  return { isNew, markAsRead: markItemAsRead, focusTargetRef };
};
