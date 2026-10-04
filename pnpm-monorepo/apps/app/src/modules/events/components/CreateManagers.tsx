"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { Event } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createManagers } from "../actions/createManagers";

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const CreateManagers = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  const formAction = async (formData: FormData) => {
    if (await runAction(createManagers, formData)) setIsOpen(false);
  };

  return (
    <>
      <Button2
        onClick={handleClick}
        variant={Button2Variant.Secondary}
        className={clsx(props.className)}
        title="Manager hinzufügen"
      >
        <FaPlus />
        <span className="hidden md:inline">Hinzufügen</span>
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-120"
        heading={<h2>Manager hinzufügen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="eventId" value={props.event.id} />

          <CitizenInput name="managerId" multiple autoFocus />

          <div className="mt-4 flex flex-col gap-2">
            <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
};
