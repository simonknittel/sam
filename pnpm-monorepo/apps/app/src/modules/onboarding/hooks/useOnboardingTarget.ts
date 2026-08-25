"use client";

import { useEffect, useState } from "react";
import type { OnboardingTargetId } from "../utils/targets";

/** How long the tour waits for a target element before it falls back */
const TARGET_WAIT_TIMEOUT_MILLISECONDS = 4000;
const TARGET_POLL_INTERVAL_MILLISECONDS = 100;

interface TargetSearchResult {
  /** The search this result belongs to — stale writes are ignored on read */
  readonly searchKey: string;
  readonly element: HTMLElement | null;
  readonly hasTimedOut: boolean;
}

/**
 * Waits for the element marked with the given `data-onboarding-target`
 * attribute. The lookup polls continuously: the target page may still be
 * loading after a navigation, and the page can unmount and remount the
 * element (e.g. a filter re-render). When the element does not appear within
 * the timeout, the step falls back to a centered card, so a removed or
 * renamed target never dead-ends the tour.
 *
 * The result carries the key of the search which produced it: the previous
 * step's interval can fire once more between a step change and its own
 * cleanup, and without the key its stale element would survive into the new
 * step (with no active poll left to clear it).
 */
export const useOnboardingTarget = (
  targetId: OnboardingTargetId | undefined,
  enabled: boolean,
) => {
  const searchKey = `${targetId ?? ""}|${enabled}`;

  const [searchResult, setSearchResult] = useState<TargetSearchResult | null>(
    null,
  );

  useEffect(() => {
    if (!targetId || !enabled) return;

    const startedAt = Date.now();
    let hasWarned = false;

    const poll = () => {
      const foundElement = document.querySelector<HTMLElement>(
        `[data-onboarding-target="${targetId}"]`,
      );
      const hasTimedOut =
        !foundElement &&
        Date.now() - startedAt >= TARGET_WAIT_TIMEOUT_MILLISECONDS;

      if (hasTimedOut && !hasWarned) {
        hasWarned = true;
        console.warn(
          `[Onboarding] Target element "${targetId}" did not appear, falling back to a centered step.`,
        );
      }

      setSearchResult((previousResult) => {
        /**
         * Bail out on unchanged results, so the continuous polling doesn't
         * cause re-renders.
         */
        if (
          previousResult?.searchKey === searchKey &&
          previousResult.element === foundElement &&
          previousResult.hasTimedOut === hasTimedOut
        )
          return previousResult;

        return { searchKey, element: foundElement, hasTimedOut };
      });
    };

    const firstPollId = window.setTimeout(poll, 0);
    const intervalId = window.setInterval(
      poll,
      TARGET_POLL_INTERVAL_MILLISECONDS,
    );

    return () => {
      window.clearTimeout(firstPollId);
      window.clearInterval(intervalId);
    };
  }, [targetId, enabled, searchKey]);

  const isCurrentSearch = searchResult?.searchKey === searchKey;

  return {
    element: isCurrentSearch ? searchResult.element : null,
    hasTimedOut: isCurrentSearch ? searchResult.hasTimedOut : false,
  };
};
