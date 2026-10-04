"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import Button from "@/modules/common/components/Button";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { useId, useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createShipAction } from "../actions/createShipAction";
import type {
  VariantCatalogManufacturer,
  VariantCatalogVariant,
} from "../queries/getVariantCatalog";

interface Props {
  readonly className?: string;
  readonly data?: readonly VariantCatalogManufacturer[];
}

export const AssignShip = ({ className, data = [] }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectId = useId();
  const inputId = useId();

  const formAction = async (formData: FormData) => {
    if (await runAction(createShipAction, formData)) setIsOpen(false);
  };

  const options: {
    manufacturer: VariantCatalogManufacturer;
    variants: VariantCatalogVariant[];
  }[] = data
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((manufacturer) => {
      return {
        manufacturer,
        variants: manufacturer.series
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map((series) =>
            series.variants.toSorted((a, b) => a.name.localeCompare(b.name)),
          )
          .flat(),
      };
    });

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
          <label className="block" htmlFor={selectId}>
            Schiff
          </label>
          <Select name="variantId" className="mt-2" id={selectId} autoFocus>
            {options.map((option) => (
              <optgroup
                key={option.manufacturer.id}
                label={option.manufacturer.name}
              >
                {option.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>

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
