"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { api } from "@/trpc/react";
import { type Citizen, type Event } from "@sam-monorepo/database/browser";
import {
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
  getCitizenDisplayName,
} from "@sam-monorepo/domain";
import { FaTrash } from "react-icons/fa";
import { removeEventParticipant } from "../actions/removeEventParticipant";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
}

export const RemoveEventParticipant = ({
  className,
  eventId,
  citizen,
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
        { name: "citizenId", value: citizen.id },
      ]}
      trigger={(isPending) => (
        <button
          type="submit"
          disabled={isPending}
          /**
           * `relative` keeps the `sr-only` label in the button. Without it,
           * the label leaves the scroll container of the table and widens the
           * page on small screens.
           */
          className="relative flex size-8 items-center justify-center rounded-secondary text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-300 enabled:cursor-pointer disabled:opacity-50"
          title="Teilnehmer entfernen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          <span className="sr-only">Entfernen</span>
        </button>
      )}
      title="Teilnehmer entfernen?"
      description={`${getCitizenDisplayName(citizen)} wird vom Event abgemeldet und benachrichtigt.`}
      confirmLabel="Entfernen"
    >
      <div>
        <Textarea
          label="Grund (optional)"
          hint={`max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
          name="reason"
          maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
          classNameTextarea="h-20"
        />
      </div>
    </ConfirmActionButton>
  );
};
