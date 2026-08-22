"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { api } from "@/trpc/react";
import type { Event } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState, useTransition } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { addEventParticipants } from "../actions/addEventParticipants";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
}

export const AddEventParticipants = ({ className, eventId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [submitIsPending, startSubmitTransition] = useTransition();

  /**
   * Only the citizens who can see the event and are not participating yet.
   * Resolved server-side while the modal is open so a sign-up between two
   * openings does not leave a stale option behind.
   */
  const { isPending, data: addableCitizenIds } =
    api.events.getAddableParticipantIds.useQuery(
      { eventId },
      {
        enabled: isOpen,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    );

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  const formAction = (formData: FormData) => {
    startSubmitTransition(async () => {
      if (await runAction(addEventParticipants, formData)) setIsOpen(false);
    });
  };

  return (
    <>
      <Button2
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.Secondary}
        className={clsx(className)}
        title="Teilnehmer hinzufügen"
      >
        <FaPlus />
        <span className="hidden md:inline">Hinzufügen</span>
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-120"
        heading={<h2>Teilnehmer hinzufügen</h2>}
      >
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />

          {isPending || !addableCitizenIds ? (
            <div className="h-10 animate-pulse rounded-secondary bg-neutral-900" />
          ) : (
            <CitizenInput
              name="citizenId"
              multiple
              selectableCitizenIds={addableCitizenIds}
              autoFocus
            />
          )}

          <Textarea
            className="mt-4"
            name="comment"
            label="Kommentar"
            hint="optional, max. 500 Zeichen, gilt für alle hinzugefügten Teilnehmer und kann von ihnen selbst geändert werden"
            maxLength={500}
            classNameTextarea="h-20"
          />

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
