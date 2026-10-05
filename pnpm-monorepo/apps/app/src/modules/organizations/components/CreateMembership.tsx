"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/browser";
import { useId, useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createOrganizationMembership } from "../actions/createOrganizationMembership";

type Props = {
  readonly className?: string;
  readonly showConfirmButton?: boolean;
} &
  /** On an organization's page the citizen is entered in the modal */
  (
    | { readonly organizationId: string; readonly citizenId?: never }
    /** On a citizen's page the organization is entered in the modal */
    | { readonly organizationId?: never; readonly citizenId: string }
  );

export const CreateMembership = ({
  className,
  showConfirmButton = false,
  organizationId,
  citizenId,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isPending, submitWithoutReset } = useAction(createOrganizationMembership, {
    onSuccess: () => setIsOpen(false),
  });
  const typeInputId = useId();
  const visibilityInputId = useId();

  const counterpartLabel = organizationId
    ? "Citizen hinzufügen"
    : "Organisation hinzufügen";


  return (
    <>
      <Button
        className={className}
        variant={organizationId ? "tertiary" : "secondary"}
        onClick={() => setIsOpen(true)}
        title={counterpartLabel}
      >
        <FaPlus /> Hinzufügen
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>{counterpartLabel}</h2>}
      >
        <form onSubmit={submitWithoutReset}>
          {organizationId ? (
            <input type="hidden" name="organizationId" value={organizationId} />
          ) : (
            <input type="hidden" name="citizenId" value={citizenId} />
          )}

          <TextInput
            name={organizationId ? "citizenId" : "organizationId"}
            label={
              organizationId
                ? "Citizen (Internal ID)"
                : "Organisation (Internal ID)"
            }
            required
            autoFocus
          />

          <label className="mt-6 block" htmlFor={typeInputId}>
            Typ
          </label>

          <Select
            className="mt-2"
            id={typeInputId}
            name="type"
            defaultValue={OrganizationMembershipType.MAIN}
          >
            <option value={OrganizationMembershipType.MAIN}>Main</option>
            <option value={OrganizationMembershipType.AFFILIATE}>
              Affiliate
            </option>
          </Select>

          <div className="mt-6 flex items-center justify-between">
            <label htmlFor={visibilityInputId}>Redacted</label>

            <YesNoCheckbox
              id={visibilityInputId}
              name="visibility"
              value={OrganizationMembershipVisibility.REDACTED}
            />
          </div>

          <div className="mt-8 flex flex-row-reverse items-center gap-4">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>

            {showConfirmButton && (
              <Button
                type="submit"
                disabled={isPending}
                variant="tertiary"
                name="confirmed"
                value={ConfirmationStatus.CONFIRMED}
              >
                {isPending ? <AsciiSpinner /> : <FaSave />}
                Speichern und bestätigen
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};
