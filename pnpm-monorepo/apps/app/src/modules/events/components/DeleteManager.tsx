"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Entity, type Event } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteManager } from "../actions/deleteManager";

interface Props {
  readonly className?: string;
  readonly eventId: Event["id"];
  readonly managerId: Entity["id"];
}

export const DeleteManager = ({ className, eventId, managerId }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteManager}
      hiddenFields={[
        { name: "eventId", value: eventId },
        { name: "managerId", value: managerId },
      ]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="text-brand-red-500 hover:text-brand-red-300 flex items-center px-2 h-full"
          title="Manager entfernen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
        </button>
      )}
      title="Manager entfernen?"
      description="Willst du diesen Manager vom Event entfernen?"
      confirmLabel="Entfernen"
    />
  );
};
