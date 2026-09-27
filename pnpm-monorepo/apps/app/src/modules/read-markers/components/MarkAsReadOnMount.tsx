"use client";

import type { ReadMarkerSubject } from "@sam-monorepo/domain";
import { useEffect, useRef } from "react";
import { markAsRead } from "../actions/markAsRead";

interface Props {
  readonly subject: ReadMarkerSubject;
  readonly subjectId: string;
}

/**
 * Marks the item as read once its details actually mounted in the browser.
 * Deliberately not during the server render: hover-triggered prefetching
 * (see the common `<Link>`) renders details the user never opens. Renders
 * nothing.
 */
export const MarkAsReadOnMount = ({ subject, subjectId }: Props) => {
  const markedItemRef = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- There is no user event: mounting in the browser IS the visit, so the effect reports it to the server.
    if (markedItemRef.current === `${subject}:${subjectId}`) return;
    markedItemRef.current = `${subject}:${subjectId}`;

    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("subjectId", subjectId);
    /**
     * Fire-and-forget instead of `runAction()`: a failed read marker must
     * never surface to the user, and `runAction()` toasts errors.
     */
    markAsRead(formData).catch(() => {
      // Failures are already logged server-side.
    });
  }, [subject, subjectId]);

  return null;
};
