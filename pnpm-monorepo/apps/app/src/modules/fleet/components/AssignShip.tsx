"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";
import { useId, useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createShipAction } from "../actions/createShipAction";
import type { VariantCatalog } from "../queries/getVariantCatalog";
import { ACQUISITION_SOURCE_LABEL } from "../utils/acquisitionSourceLabel";
import { VariantPicker } from "./VariantPicker/VariantPicker";

interface Props {
  readonly className?: string;
  readonly catalog: VariantCatalog;
}

export const AssignShip = ({ className, catalog }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const acquisitionSourceId = useId();
  const inputId = useId();
  const noteId = useId();

  const formAction = async (formData: FormData) => {
    if (await runAction(createShipAction, formData)) setIsOpen(false);
  };

  return (
    <>
      <Button2
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.Secondary}
        className={className}
        title="Hinzufügen"
        data-onboarding-target={OnboardingTargetId.FleetAddShip}
      >
        <FaPlus />
        <span className="hidden md:inline">Hinzufügen</span>
      </Button2>

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

          <label className="mt-6 block" htmlFor={acquisitionSourceId}>
            Herkunft
          </label>
          <Select
            name="acquisitionSource"
            className="mt-2"
            id={acquisitionSourceId}
            defaultValue=""
            required
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            {Object.values(ShipAcquisitionSource).map((source) => (
              <option key={source} value={source}>
                {ACQUISITION_SOURCE_LABEL[source]}
              </option>
            ))}
          </Select>

          <TextInput
            label="Schiffsname"
            name="name"
            className="mt-6"
            id={inputId}
            hint="optional"
          />

          <TextInput
            label="Notiz"
            name="note"
            className="mt-6"
            id={noteId}
            maxLength={255}
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
