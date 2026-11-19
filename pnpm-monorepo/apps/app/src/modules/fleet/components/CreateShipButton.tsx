"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { FaPlus } from "react-icons/fa";

interface Props {
  readonly className?: string;
}

export const CreateShipButton = ({ className }: Props) => {
  const { openCreateModal } = useCreateContext();

  return (
    <Button2
      onClick={() => openCreateModal("ship")}
      variant={Button2Variant.Secondary}
      className={className}
      title="Hinzufügen"
      data-onboarding-target={OnboardingTargetId.FleetAddShip}
    >
      <FaPlus />
      <span className="hidden md:inline">Hinzufügen</span>
    </Button2>
  );
};
