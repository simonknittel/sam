"use client";

import {
  type Manufacturer,
  type Series,
  type Variant,
} from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { flatten } from "lodash";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner } from "react-icons/fa";
import { createShipAction } from "../actions/createShipAction";

interface Props {
  readonly className?: string;
  readonly data?: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
}

export const AssignShip = ({ className, data = [] }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectId = useId();
  const inputId = useId();
  const [isPending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const response = await createShipAction(formData);

        if (response.success) {
          toast.success(response.success);
          setIsOpen(false);
        } else {
          toast.error(response.error!);
        }
      } catch (error) {
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  const options: {
    manufacturer: Manufacturer;
    variants: Variant[];
  }[] = data
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((manufacturer) => {
      return {
        manufacturer,
        variants: flatten(
          manufacturer.series
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((series) =>
              series.variants
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((variant) => variant),
            ),
        ),
      };
    });

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="tertiary"
        className={className}
      >
        Hinzufügen <FaPlus />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-[480px]"
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

          <div className="flex justify-end mt-8">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Hinzufügen
            </Button2>
          </div>
        </form>
      </Modal>
    </>
  );
};
