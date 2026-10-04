"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly action: (formData: FormData) => Promise<ActionResponse>;
}

export const CreateSettingsRecord = ({ className, action }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();

  const { state, formAction, getDefaultValueWithFallback } = useAction(action, {
    errorToast: false,
    onSuccess: () => setIsOpen(false),
  });

  return (
    <>
      <Button2
        variant={Button2Variant.Secondary}
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        <FaPlus />
        Hinzufügen
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Hinzufügen</h2>}
      >
        <form action={formAction}>
          <label className="block" htmlFor={inputId}>
            Name
          </label>

          <input
            className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
            id={inputId}
            name="name"
            defaultValue={getDefaultValueWithFallback("name", "")}
            required
            autoFocus
          />

          <div className="mt-8 flex justify-end">
            <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
          </div>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
