"use client";

import { ONBOARDING_POPOVER_SEARCH_PARAM } from "@sam-monorepo/domain";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useOnboarding } from "./OnboardingProvider";

/**
 * Removes the parameter, thus a reload does not open the popover again. The
 * removal goes through the history of the browser, which Next.js keeps in sync
 * with its router. A queued update of nuqs is lost when the parameter arrives
 * through a client-side navigation, because that navigation clears the queue
 * of nuqs.
 */
export const OnboardingPopoverOpener = () => {
  const searchParams = useSearchParams();
  const isRequested = searchParams.has(ONBOARDING_POPOVER_SEARCH_PARAM);
  const { requestPopoverOpen } = useOnboarding();

  useEffect(() => {
    if (!isRequested) return;

    requestPopoverOpen();

    const url = new URL(window.location.href);
    url.searchParams.delete(ONBOARDING_POPOVER_SEARCH_PARAM);
    window.history.replaceState(null, "", url);
  }, [isRequested, requestPopoverOpen]);

  return null;
};
