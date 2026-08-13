"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type PenaltyEntry } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deletePenaltyEntry } from "../actions/deletePenaltyEntry";

interface Props {
  readonly className?: string;
  readonly entry: PenaltyEntry;
}

export const DeletePenaltyEntry = ({ className, entry }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deletePenaltyEntry}
      hiddenFields={[{ name: "id", value: entry.id }]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="text-brand-red-500 hover:text-brand-red-300 flex items-center hover:cursor-pointer"
          title="Löschen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
        </button>
      )}
      title="Strafpunkte löschen?"
      description="Willst du diesen Eintrag löschen?"
      confirmLabel="Löschen"
    />
  );
};
