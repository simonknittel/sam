"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { FaShoePrints } from "react-icons/fa";
import { useOnboarding } from "./OnboardingProvider";

export const WelcomeBannerCallToAction = () => {
  const { eligibleTasks, requestPopoverOpen } = useOnboarding();
  if (eligibleTasks.length === 0) return null;

  return (
    <Button2 type="button" onClick={requestPopoverOpen}>
      <FaShoePrints className="rotate-270" aria-hidden />
      Lerne das SAM kennen
    </Button2>
  );
};
