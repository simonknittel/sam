"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import Button from "@/modules/common/components/Button";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaPen, FaSave } from "react-icons/fa";
import type { SettingsRecord } from "./SettingsRecord";

interface Props {
  readonly className?: string;
  readonly action: (formData: FormData) => Promise<ActionResponse>;
  readonly record: SettingsRecord;
}

export const UpdateSettingsRecord = ({ className, action, record }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();

  const { formAction, getDefaultValueWithFallback } = useAction(action, {
    onSuccess: () => setIsOpen(false),
  });

  return (
    <>
      <Button
        variant="tertiary"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        <FaPen />
        Bearbeiten
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-120"
        heading={<h2>Bearbeiten</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={record.id} />

          <label className="block" htmlFor={inputId}>
            Name
          </label>

          <input
            className="mt-2 w-full rounded-secondary bg-neutral-900 p-2"
            id={inputId}
            name="name"
            defaultValue={getDefaultValueWithFallback("name", record.name)}
            required
            autoFocus
          />

          <div className="mt-8 flex justify-end">
            <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
};
