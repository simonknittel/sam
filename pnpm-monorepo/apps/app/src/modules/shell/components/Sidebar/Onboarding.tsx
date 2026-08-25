"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { OnboardingPopoverContent } from "@/modules/onboarding/components/OnboardingPopoverContent";
import { useOnboarding } from "@/modules/onboarding/components/OnboardingProvider";
import { useEffect } from "react";
import { FaShoePrints } from "react-icons/fa";
import { useMobileActionBarFlyoutVisibility } from "./MobileActionBarFlyout";

export const Onboarding = () => {
  const { eligibleTasks, openTaskCount } = useOnboarding();
  if (eligibleTasks.length === 0) return null;

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
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();
  const isFlyoutVisible = useMobileActionBarFlyoutVisibility();

  /**
   * The flyout can close underneath the open popover (e.g. through browser
   * back navigation) — close the popover along with it.
   */
  useEffect(() => {
    if (!isFlyoutVisible) closePopover();
  }, [isFlyoutVisible, closePopover]);

  return <OnboardingPopoverContent />;
};
