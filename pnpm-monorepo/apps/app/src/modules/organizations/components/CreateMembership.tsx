"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/browser";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaPlus, FaSave } from "react-icons/fa";

interface FormValues {
  counterpartId: string;
  type: OrganizationMembershipType;
  visibility: OrganizationMembershipVisibility;
  confirmed?: "CONFIRMED";
}

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
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      type: OrganizationMembershipType.MAIN,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const counterpartInputId = useId();
  const typeInputId = useId();
  const visibilityInputId = useId();

  const counterpartLabel = organizationId
    ? "Citizen hinzufügen"
    : "Organisation hinzufügen";

  const onSubmit: SubmitHandler<FormValues> = async (data, event) => {
    setIsLoading(true);
    if (
      !(event?.nativeEvent instanceof SubmitEvent) ||
      !(event.nativeEvent.submitter instanceof HTMLButtonElement)
    )
      return;

    try {
      const response = await fetch(
        `/api/spynet/organization/${organizationId ?? data.counterpartId}/membership`,
        {
          method: "POST",
          body: JSON.stringify({
            citizenId: citizenId ?? data.counterpartId,
            type: data.type,
            redacted: data.visibility || false,
            confirmed:
              event.nativeEvent.submitter.name === "confirmed"
                ? ConfirmationStatus.CONFIRMED
                : undefined,
          }),
        },
      );

      if (response.ok) {
        router.refresh();
        reset();
        setIsOpen(false);
        toast.success("Erfolgreich gespeichert");
      } else {
        toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Speichern ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

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
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="block" htmlFor={counterpartInputId}>
            {organizationId
              ? "Citizen (Internal ID)"
              : "Organisation (Internal ID)"}
          </label>

          <input
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            id={counterpartInputId}
            {...register("counterpartId", { required: true })}
            autoFocus
          />

          <label className="mt-6 block" htmlFor={typeInputId}>
            Typ
          </label>

          <select
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            id={typeInputId}
            {...register("type", { required: true })}
          >
            <option value={OrganizationMembershipType.MAIN}>Main</option>
            <option value={OrganizationMembershipType.AFFILIATE}>
              Affiliate
            </option>
          </select>

          <div className="mt-6 flex justify-between items-center">
            <label htmlFor={visibilityInputId}>Redacted</label>

            <YesNoCheckbox
              {...register("visibility")}
              id={visibilityInputId}
              value={OrganizationMembershipVisibility.REDACTED}
            />
          </div>

          <div className="flex flex-row-reverse gap-4 items-center mt-8">
            <Button2 type="submit" disabled={isLoading}>
              {isLoading ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>

            {showConfirmButton && (
              <Button
                type="submit"
                disabled={isLoading}
                variant="tertiary"
                name="confirmed"
              >
                {isLoading ? <AsciiSpinner /> : <FaSave />}
                Speichern und bestätigen
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};
