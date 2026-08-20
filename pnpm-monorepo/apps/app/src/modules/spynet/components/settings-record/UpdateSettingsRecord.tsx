"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
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

  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(action, {
      errorToast: false,
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
            className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
            id={inputId}
            name="name"
            defaultValue={getDefaultValueWithFallback("name", record.name)}
            required
            autoFocus
          />

          <div className="flex justify-end mt-8">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>
          </div>

          <ActionErrorNote className="mt-4" state={state} />
        </form>
      </Modal>
    </>
  );
};
