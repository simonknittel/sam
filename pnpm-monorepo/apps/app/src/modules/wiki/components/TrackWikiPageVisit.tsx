"use client";

import { useEffect, useRef } from "react";
import { trackWikiPageVisit } from "../actions/trackWikiPageVisit";

interface Props {
  readonly pageId: string;
}

/**
 * Reports the page as visited once it actually mounted in the browser.
 * Deliberately not tracked during the server render: hover-triggered
 * prefetching (see the common `<Link>`) renders wiki pages the user never
 * opens, while a navigation served from the prefetch cache triggers no
 * server render at all. Renders nothing.
 */
export const TrackWikiPageVisit = ({ pageId }: Props) => {
  const trackedPageIdRef = useRef<string | null>(null);

  // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- There is no user event: mounting in the browser IS the visit, so the effect reports it to the server.
  useEffect(() => {
    if (trackedPageIdRef.current === pageId) return;
    trackedPageIdRef.current = pageId;

    const formData = new FormData();
    formData.set("pageId", pageId);
    /**
     * Fire-and-forget instead of `runAction()`: a failed visit ping must
     * never surface to the user, and `runAction()` toasts errors.
     */
    trackWikiPageVisit(formData).catch(() => {
      // Failures are already logged server-side.
    });
  }, [pageId]);

  return null;
};
