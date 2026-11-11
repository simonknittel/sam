"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { api } from "@/trpc/react";
import { type Citizen, type Event } from "@sam-monorepo/database/browser";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import { FaTrash } from "react-icons/fa";
import { withdrawEventInvitation } from "../actions/withdrawEventInvitation";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
}

export const WithdrawEventInvitation = ({
  className,
  eventId,
  citizen,
}: Props) => {
  const utils = api.useUtils();

  return (
    <ConfirmActionButton
      className={className}
      action={withdrawEventInvitation}
      /** The citizen can get a new invitation */
      onSuccess={() =>
        void utils.events.getAddableParticipants.invalidate({ eventId })
      }
      hiddenFields={[
        { name: "eventId", value: eventId },
        { name: "citizenId", value: citizen.id },
      ]}
      trigger={(isPending) => (
        <button
          type="submit"
          disabled={isPending}
          /** `relative` keeps the `sr-only` label in the button, see `RemoveEventParticipant` */
          className="relative flex size-8 items-center justify-center rounded-secondary text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-300 enabled:cursor-pointer disabled:opacity-50"
          title="Einladung zurückziehen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
          <span className="sr-only">Zurückziehen</span>
        </button>
      )}
      title="Einladung zurückziehen?"
      description={`Die Einladung von ${getCitizenDisplayName(citizen)} wird zurückgezogen.`}
      confirmLabel="Zurückziehen"
    />
  );
};
