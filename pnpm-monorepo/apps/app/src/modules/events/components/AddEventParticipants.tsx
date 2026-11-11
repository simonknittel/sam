"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { RadioGroup } from "@/modules/common/components/form/RadioGroup";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { api } from "@/trpc/react";
import type { Event } from "@sam-monorepo/database/browser";
import { EVENT_PARTICIPATION_TEXT_MAX_LENGTH } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import { FaEnvelope, FaPlus, FaUserCheck } from "react-icons/fa";
import { addEventParticipants } from "../actions/addEventParticipants";
import { inviteEventParticipants } from "../actions/inviteEventParticipants";

enum AddMode {
  Invite = "invite",
  Add = "add",
}

const isAddMode = (value: string): value is AddMode =>
  Object.values<string>(AddMode).includes(value);

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
}

export const AddEventParticipants = ({ className, eventId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(AddMode.Invite);
  const utils = api.useUtils();

  /**
   * Only the citizens who can see the event and are not participating yet.
   * Resolved server-side while the modal is open so a sign-up between two
   * openings does not leave a stale option behind.
   */
  const { isPending, data: addableParticipants } =
    api.events.getAddableParticipants.useQuery(
      { eventId },
      {
        enabled: isOpen,
      },
    );

  /** A second invitation of a citizen with an open invitation is skipped */
  const invitedCitizenIds = new Set(addableParticipants?.invitedCitizenIds);
  const selectableCitizenIds =
    mode === AddMode.Invite
      ? addableParticipants?.citizenIds.filter(
          (citizenId) => !invitedCitizenIds.has(citizenId),
        )
      : addableParticipants?.citizenIds;

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  const formAction = async (formData: FormData) => {
    const action =
      mode === AddMode.Invite ? inviteEventParticipants : addEventParticipants;
    if (!(await runAction(action, formData))) return;

    setIsOpen(false);
    setMode(AddMode.Invite);
    /** Whoever was just added or invited must not show up in the next opening */
    await utils.events.getAddableParticipants.invalidate({ eventId });
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

          <div className="mb-4">
            <RadioGroup
              label="Art"
              name="mode"
              items={[
                {
                  value: AddMode.Invite,
                  label: "Einladen",
                  icon: <FaEnvelope />,
                  hint: "Die Citizen bekommen eine Benachrichtigung, um die Einladung anzunehmen oder abzulehnen.",
                },
                {
                  value: AddMode.Add,
                  label: "Direkt hinzufügen",
                  icon: <FaUserCheck />,
                  hint: "Die Citizen werden sofort dem Event hinzugefügt.",
                },
              ]}
              value={mode}
              onChange={(value) => {
                if (isAddMode(value)) setMode(value);
              }}
              equalWidth
            />
          </div>

          {isPending || !selectableCitizenIds ? (
            /** Mirrors CitizenInput's own pending state, label included */
            <div>
              <span className="mb-1 block">Citizen (Handle)</span>
              <div className="h-10 animate-pulse rounded-secondary bg-neutral-900" />
            </div>
          ) : (
            <CitizenInput
              name="citizenId"
              multiple
              selectableCitizenIds={selectableCitizenIds}
              autoFocus
            />
          )}

          {mode === AddMode.Invite ? (
            <Textarea
              key={AddMode.Invite}
              className="mt-4"
              name="message"
              label="Nachricht"
              hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
              maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
              classNameTextarea="h-20"
            />
          ) : (
            <Textarea
              key={AddMode.Add}
              className="mt-4"
              name="comment"
              label="Kommentar"
              hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
              maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
              classNameTextarea="h-20"
            />
          )}

          <div className="mt-4 flex flex-col gap-2">
            {mode === AddMode.Invite ? (
              <SubmitButton icon={<FaEnvelope />}>Einladen</SubmitButton>
            ) : (
              <SubmitButton icon={<FaUserCheck />}>Hinzufügen</SubmitButton>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};
