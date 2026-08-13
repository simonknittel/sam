"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import type { Event } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState, useTransition } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { createManagers } from "../actions/createManagers";

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const CreateManagers = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [submitIsPending, startSubmitTransition] = useTransition();

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  const formAction = (formData: FormData) => {
    startSubmitTransition(async () => {
      if (await runAction(createManagers, formData)) setIsOpen(false);
    });
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="tertiary"
        className={clsx(props.className)}
        title="Manager hinzufügen"
      >
        <FaPlus />
      </Button>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-120"
        heading={<h2>Manager hinzufügen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="eventId" value={props.event.id} />

          <CitizenInput name="managerId" multiple autoFocus />

          <div className="flex flex-col gap-2 mt-4">
            <Button2 type="submit" disabled={submitIsPending}>
              {submitIsPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>
          </div>
        </form>
      </Modal>
    </>
  );
};
