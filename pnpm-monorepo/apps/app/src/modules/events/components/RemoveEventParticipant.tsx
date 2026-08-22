"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { api } from "@/trpc/react";
import { type Entity, type Event } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { removeEventParticipant } from "../actions/removeEventParticipant";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly citizenId: Entity["id"];
  readonly citizenHandle: string | null;
}

export const RemoveEventParticipant = ({
  className,
  eventId,
  citizenId,
  citizenHandle,
}: Props) => {
  const utils = api.useUtils();

  return (
    <ConfirmActionButton
      className={className}
      action={removeEventParticipant}
      /** The removed citizen becomes addable again */
      onSuccess={() =>
        void utils.events.getAddableParticipantIds.invalidate({ eventId })
      }
      hiddenFields={[
        { name: "eventId", value: eventId },
        { name: "citizenId", value: citizenId },
      ]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-400 flex items-center justify-center rounded-secondary size-8 enabled:cursor-pointer disabled:opacity-50"
          title="Teilnehmer entfernen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          <span className="sr-only">Entfernen</span>
        </button>
      )}
      title="Teilnehmer entfernen?"
      description={`${citizenHandle || citizenId} wird vom Event abgemeldet und benachrichtigt.`}
      confirmLabel="Entfernen"
    >
      {(formId) => (
        <div>
          <Textarea
            label="Grund (optional)"
            hint="max. 500 Zeichen"
            name="reason"
            maxLength={500}
            classNameTextarea="h-20"
            form={formId}
            autoFocus
          />
        </div>
      )}
    </ConfirmActionButton>
  );
};
