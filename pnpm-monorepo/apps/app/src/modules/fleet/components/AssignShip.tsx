"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import Button from "@/modules/common/components/Button";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { useId, useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createShipAction } from "../actions/createShipAction";
import type { VariantCatalog } from "../queries/getVariantCatalog";
import { VariantPicker } from "./VariantPicker/VariantPicker";

interface Props {
  readonly className?: string;
  readonly catalog: VariantCatalog;
}

export const AssignShip = ({ className, catalog }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();

  const formAction = async (formData: FormData) => {
    if (await runAction(createShipAction, formData)) setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        className={className}
        data-onboarding-target={OnboardingTargetId.FleetAddShip}
      >
        Hinzufügen <FaPlus />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Schiff hinzufügen</h2>}
      >
        <form action={formAction}>
          <VariantPicker
            catalog={catalog}
            name="variantId"
            label="Schiff"
            required
            autoFocus
          />

          <TextInput
            label="Schiffsname"
            name="name"
            className="mt-2"
            id={inputId}
            hint="optional"
          />

          <div className="mt-8 flex justify-end">
            <SubmitButton icon={<FaSave />}>Hinzufügen</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
};
