"use client";

import type { Event } from "@/generated/prisma/browser";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaSave, FaSpinner } from "react-icons/fa";
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
      try {
        const response = await createManagers(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return;
        }

        toast.success(response.success!);
        setIsOpen(false);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
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
        className="w-[480px]"
        heading={<h2>Manager hinzufügen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="eventId" value={props.event.id} />

          <CitizenInput name="managerId" multiple autoFocus />

          <div className="flex flex-col gap-2 mt-4">
            <Button2 type="submit" disabled={submitIsPending}>
              {submitIsPending ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSave />
              )}
              Speichern
            </Button2>
          </div>
        </form>
      </Modal>
    </>
  );
};
