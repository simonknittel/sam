"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaBullhorn } from "react-icons/fa";
import { announceEventBriefingUpdate } from "../actions/announceEventBriefingUpdate";

interface Props {
  readonly eventId: string;
}

/**
 * The pages of the briefing save each edit at once and notify nobody. With
 * this button, a manager tells the readers that the briefing changed.
 */
export const AnnounceEventBriefingUpdate = ({ eventId }: Props) => {
  return (
    <ConfirmActionButton
      action={announceEventBriefingUpdate}
      hiddenFields={[{ name: "eventId", value: eventId }]}
      trigger={(isPending) => (
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full cursor-pointer items-center gap-2 rounded-secondary px-2 py-1 text-left text-neutral-300 outline-interaction-700 hover:text-interaction-300 focus-visible:outline-2 active:text-interaction-500 disabled:cursor-wait disabled:opacity-50"
        >
          {isPending ? (
            <AsciiSpinner className="flex-none text-neutral-500" />
          ) : (
            <FaBullhorn className="size-3 flex-none text-neutral-500" />
          )}
          Änderung mitteilen
        </button>
      )}
      title="Änderung des Briefings mitteilen?"
      description="Alle, die das Briefing lesen können, bekommen eine Benachrichtigung."
      confirmLabel="Mitteilen"
    />
  );
};
