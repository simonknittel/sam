"use client";

import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner } from "react-icons/fa";

interface FormValues {
  organizationId: string;
  type: OrganizationMembershipType;
  visibility: OrganizationMembershipVisibility;
}

interface Props {
  readonly className?: string;
  readonly citizenId: string;
  readonly showConfirmButton?: boolean;
}

export const CreateOrganizationMembership = ({
  className,
  citizenId,
  showConfirmButton = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      type: OrganizationMembershipType.MAIN,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const organizationIdInputId = useId();
  const typeInputId = useId();
  const visibilityInputId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data, e) => {
    setIsLoading(true);
    if (
      !(e?.nativeEvent instanceof SubmitEvent) ||
      !(e.nativeEvent.submitter instanceof HTMLButtonElement)
    )
      return;

    try {
      const response = await fetch(
        `/api/spynet/organization/${data.organizationId}/membership`,
        {
          method: "POST",
          body: JSON.stringify({
            citizenId,
            type: data.type,
            redacted: data.visibility || false,
            confirmed:
              e.nativeEvent.submitter.name === "confirmed"
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
        variant="secondary"
        onClick={() => setIsOpen(true)}
        title="Organisation hinzufügen"
      >
        <FaPlus /> Hinzufügen
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
        heading={<h2>Organisation hinzufügen</h2>}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="block" htmlFor={organizationIdInputId}>
            Organisation (Internal ID)
          </label>

          <input
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            id={organizationIdInputId}
            {...register("organizationId", { required: true })}
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
              {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Speichern
            </Button2>

            {showConfirmButton && (
              <Button
                type="submit"
                disabled={isLoading}
                variant="tertiary"
                name="confirmed"
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSave />
                )}
                Speichern und bestätigen
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};
