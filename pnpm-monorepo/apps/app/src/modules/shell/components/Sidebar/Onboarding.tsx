"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { OnboardingPopoverContent } from "@/modules/onboarding/components/OnboardingPopoverContent";
import { useOnboarding } from "@/modules/onboarding/components/OnboardingProvider";
import { useIsLargeViewport } from "@/modules/onboarding/hooks/useIsLargeViewport";
import { useOnboardingPopoverOpenState } from "@/modules/onboarding/hooks/useOnboardingPopoverOpenState";
import { useEffect } from "react";
import { FaShoePrints } from "react-icons/fa";
import { useMobileActionBarFlyout } from "./MobileActionBarFlyout";

export const Onboarding = () => {
  const { eligibleTasks } = useOnboarding();
  if (eligibleTasks.length === 0) return null;

  return <OnboardingPopover />;
};

const OnboardingPopover = () => {
  const { openTaskCount, isPopoverOpenRequested } = useOnboarding();
  /** The mobile action bar, and thus the flyout, shows only on a small viewport */
  const isSmallViewport = !useIsLargeViewport();
  const flyout = useMobileActionBarFlyout();
  const { isOpen, setIsOpen } = useOnboardingPopoverOpenState(
    isSmallViewport && flyout.isSlideInComplete,
  );

  /** See `Create` */
  if (!flyout.isVisible && isOpen) setIsOpen(false);

  const mustShowFlyout =
    isPopoverOpenRequested && isSmallViewport && !flyout.isVisible;
  const { show: showFlyout } = flyout;

  useEffect(() => {
    if (mustShowFlyout) showFlyout();
  }, [mustShowFlyout, showFlyout]);

  return (
    <PopoverBaseUI
      title="Erste Schritte"
      trigger={
        <>
          <FaShoePrints className="rotate-270" />
          {openTaskCount > 0 && <UnreadDot className="ml-1" />}
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerTitle="Erste Schritte"
      childrenClassName="w-96 max-w-[calc(100dvw-1rem)]"
      positionerClassName="z-60"
      side="bottom"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <OnboardingPopoverContent />
    </PopoverBaseUI>
  );
};
