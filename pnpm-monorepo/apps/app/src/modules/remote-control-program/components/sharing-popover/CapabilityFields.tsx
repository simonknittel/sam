"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { CapabilityId } from "@sam-monorepo/domain";
import { useId, useState } from "react";
import { ShareGrantFormField } from "../../utils/shareGrantFormFields";
import { CAPABILITY_LABELS } from "./catalogTexts";

const CAPABILITY_IDS = Object.values(CapabilityId);

/**
 * The capabilities of a new grant. A grant always covers a full capability
 * (decision 10).
 */
export const CapabilityFields = () => {
  const [selectedCapabilityIds, setSelectedCapabilityIds] =
    useState<readonly CapabilityId[]>(CAPABILITY_IDS);

  const toggleCapability = (capabilityId: CapabilityId, isChecked: boolean) => {
    setSelectedCapabilityIds((capabilityIds) =>
      isChecked
        ? [...capabilityIds, capabilityId]
        : capabilityIds.filter((selectedId) => selectedId !== capabilityId),
    );
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1">Was teilst du?</legend>

      <ul className="flex flex-col gap-1">
        {CAPABILITY_IDS.map((capabilityId) => (
          <CapabilityOption
            key={capabilityId}
            capabilityId={capabilityId}
            isChecked={selectedCapabilityIds.includes(capabilityId)}
            onChange={toggleCapability}
          />
        ))}
      </ul>
    </fieldset>
  );
};

interface CapabilityOptionProps {
  readonly capabilityId: CapabilityId;
  readonly isChecked: boolean;
  readonly onChange: (capabilityId: CapabilityId, isChecked: boolean) => void;
}

const CapabilityOption = ({
  capabilityId,
  isChecked,
  onChange,
}: CapabilityOptionProps) => {
  const id = useId();

  return (
    <li className="flex items-center gap-2">
      <YesNoCheckbox
        id={id}
        hideLabel
        name={ShareGrantFormField.CapabilityIds}
        value={capabilityId}
        checked={isChecked}
        onChange={(event) => onChange(capabilityId, event.target.checked)}
      />

      <label
        htmlFor={id}
        className="cursor-pointer hover:text-white active:text-neutral-300"
      >
        {CAPABILITY_LABELS[capabilityId]}
      </label>
    </li>
  );
};
