"use client";

import { useEffect, useState } from "react";
import { useOnboarding } from "../components/OnboardingProvider";

/** Only one surface at a time can act, otherwise two popovers open */
export const useOnboardingPopoverOpenState = (canActOnRequest: boolean) => {
  const { isPopoverOpenRequested, settlePopoverOpenRequest } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);

  const isActingOnRequest = isPopoverOpenRequested && canActOnRequest;
  if (isActingOnRequest && !isOpen) setIsOpen(true);

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The request comes from a different component, and a render must not change the state of the provider.
    if (isActingOnRequest) settlePopoverOpenRequest();
  }, [isActingOnRequest, settlePopoverOpenRequest]);

  return { isOpen, setIsOpen };
};
