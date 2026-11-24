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
import clsx from "clsx";
import { FaCheck, FaTimes } from "react-icons/fa";
import { approveEventApplication } from "../actions/approveEventApplication";
import { declineEventApplication } from "../actions/declineEventApplication";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
}

/**
 * `relative` keeps the `sr-only` label in the button, see
 * `RemoveEventParticipant`
 */
const ICON_BUTTON_CLASS_NAME =
  "relative flex size-8 items-center justify-center rounded-secondary enabled:cursor-pointer disabled:opacity-50";

export const AnswerEventApplication = ({
  className,
  eventId,
  citizen,
}: Props) => {
  const utils = api.useUtils();
  const hiddenFields = [
    { name: "eventId", value: eventId },
    { name: "citizenId", value: citizen.id },
  ];
  const displayName = getCitizenDisplayName(citizen);

  return (
    <div className={clsx("flex", className)}>
      <ConfirmActionButton
        action={approveEventApplication}
        /** The approved citizen is a participant now, thus not addable */
        onSuccess={() =>
          void utils.events.getAddableParticipants.invalidate({ eventId })
        }
        hiddenFields={hiddenFields}
        trigger={(isPending) => (
          <button
            type="submit"
            disabled={isPending}
            className={clsx(
              ICON_BUTTON_CLASS_NAME,
              "text-green-500 hover:text-green-300 focus-visible:text-green-300 active:text-green-300",
            )}
            title="Teilnahmeanfrage annehmen"
          >
            {isPending ? <AsciiSpinner /> : <FaCheck />}
            <span className="sr-only">{`Teilnahmeanfrage von ${displayName} annehmen`}</span>
          </button>
        )}
        title="Teilnahmeanfrage annehmen?"
        description={`${displayName} wird für das Event angemeldet und benachrichtigt.`}
        confirmLabel="Annehmen"
      />

      <ConfirmActionButton
        action={declineEventApplication}
        hiddenFields={hiddenFields}
        trigger={(isPending) => (
          <button
            type="submit"
            disabled={isPending}
            className={clsx(
              ICON_BUTTON_CLASS_NAME,
              "text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-300",
            )}
            title="Teilnahmeanfrage ablehnen"
          >
            {isPending ? <AsciiSpinner /> : <FaTimes />}
            <span className="sr-only">{`Teilnahmeanfrage von ${displayName} ablehnen`}</span>
          </button>
        )}
        title="Teilnahmeanfrage ablehnen?"
        description={`${displayName} wird benachrichtigt und kann die Teilnahme nicht erneut anfragen. Du kannst den Citizen später noch einladen oder hinzufügen.`}
        confirmLabel="Ablehnen"
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
    </div>
  );
};
