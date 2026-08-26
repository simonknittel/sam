"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * An item counts as viewed once at least this share of it has been visible
 * for the dwell time.
 */
export const READ_ON_VIEW_VISIBILITY_THRESHOLD = 0.5;

/**
 * An item taller than the visible area can never reach the share above, so it
 * counts as viewed once it reaches the centered band of this height instead.
 * Items which only peek in at an edge stay outside of it.
 */
const READ_ON_VIEW_BAND_ROOT_MARGIN = "-25% 0px -25% 0px";

export const READ_ON_VIEW_DWELL_MILLISECONDS = 500;

/**
 * Viewed items are collected and reported in batches to avoid one server
 * action per item while scrolling.
 */
export const READ_ON_VIEW_FLUSH_DEBOUNCE_MILLISECONDS = 1_000;

/**
 * Ref callback which registers an element for read-on-view tracking. The id
 * the element reports is read from its `data-read-on-view-id` attribute.
 */
export type ReadOnViewRef = (element: Element | null) => (() => void) | void;

interface Options {
  /**
   * While false nothing is observed and everything already collected is
   * reported, so a list which is hidden or switched away from stops marking
   * its items.
   */
  readonly enabled?: boolean;
  /**
   * Scroll container the observed elements live in. Omit for lists which
   * scroll with the page. Read once per observer, so the container has to be
   * mounted while `enabled` is true.
   */
  readonly rootRef?: RefObject<Element | null>;
  /** Receives the ids of the elements which have been viewed, in batches. */
  readonly onRead: (ids: string[]) => void;
}

/**
 * Read-on-view tracking: reports the id of every registered element which
 * stays sufficiently visible for the dwell time, batched over a short
 * debounce. Register an element with the returned ref callback and put its id
 * into `data-read-on-view-id`. Dropping the ref stops the tracking of that
 * element, which is how an item opts out once it has been reported.
 */
export const useReadOnView = ({ enabled = true, rootRef, onRead }: Options) => {
  const registeredElements = useRef(new Set<Element>());
  const observersRef = useRef<IntersectionObserver[]>([]);

  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const observeItem: ReadOnViewRef = useCallback((element) => {
    if (!element) return;

    registeredElements.current.add(element);
    for (const observer of observersRef.current) {
      observer.observe(element);
    }

    return () => {
      registeredElements.current.delete(element);
      for (const observer of observersRef.current) {
        observer.unobserve(element);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dwellTimers = new Map<string, number>();
    const pendingIds = new Set<string>();
    let flushTimer: number | null = null;

    /** The ids each of the two criteria currently considers visible */
    const visibleByShare = new Set<string>();
    const visibleByBand = new Set<string>();

    const flush = () => {
      if (pendingIds.size <= 0) return;
      const idsToReport = Array.from(pendingIds);
      pendingIds.clear();
      onReadRef.current(idsToReport);
    };

    const reportViewed = (id: string, element: Element) => {
      dwellTimers.delete(id);
      visibleByShare.delete(id);
      visibleByBand.delete(id);
      for (const observer of observers) {
        observer.unobserve(element);
      }

      pendingIds.add(id);
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(
        flush,
        READ_ON_VIEW_FLUSH_DEBOUNCE_MILLISECONDS,
      );
    };

    const updateVisibility = (
      id: string,
      element: Element,
      visibleIds: Set<string>,
      isVisible: boolean,
    ) => {
      if (isVisible) visibleIds.add(id);
      else visibleIds.delete(id);

      if (!visibleByShare.has(id) && !visibleByBand.has(id)) {
        const dwellTimer = dwellTimers.get(id);
        if (dwellTimer === undefined) return;
        window.clearTimeout(dwellTimer);
        dwellTimers.delete(id);
        return;
      }

      if (dwellTimers.has(id)) return;
      dwellTimers.set(
        id,
        window.setTimeout(
          () => reportViewed(id, element),
          READ_ON_VIEW_DWELL_MILLISECONDS,
        ),
      );
    };

    const handleEntries =
      (
        visibleIds: Set<string>,
        isVisible: (entry: IntersectionObserverEntry) => boolean,
      ) =>
      (entries: IntersectionObserverEntry[]) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.readOnViewId;
          if (!id) continue;
          updateVisibility(id, entry.target, visibleIds, isVisible(entry));
        }
      };

    const root = rootRef?.current ?? null;

    const observers = [
      new IntersectionObserver(
        handleEntries(
          visibleByShare,
          (entry) =>
            entry.intersectionRatio >= READ_ON_VIEW_VISIBILITY_THRESHOLD,
        ),
        { root, threshold: READ_ON_VIEW_VISIBILITY_THRESHOLD },
      ),
      new IntersectionObserver(
        handleEntries(visibleByBand, (entry) => entry.isIntersecting),
        { root, rootMargin: READ_ON_VIEW_BAND_ROOT_MARGIN, threshold: 0 },
      ),
    ];

    observersRef.current = observers;
    for (const element of registeredElements.current) {
      for (const observer of observers) {
        observer.observe(element);
      }
    }

    return () => {
      observersRef.current = [];
      for (const observer of observers) {
        observer.disconnect();
      }
      for (const dwellTimer of dwellTimers.values()) {
        window.clearTimeout(dwellTimer);
      }
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      flush();
    };
  }, [enabled, rootRef]);

  return observeItem;
};
