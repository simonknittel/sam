"use client";

import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { type EventPosition } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteEventPosition } from "../actions/deleteEventPosition";

const LABEL = "Posten löschen";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
}

export const DeleteEventPosition = ({ className, position }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteEventPosition}
      hiddenFields={[{ name: "id", value: position.id }]}
      trigger={(isPending) => (
        <Tooltip
          asChild
          triggerChildren={
            <button
              disabled={isPending}
              className="text-brand-red-500 hover:text-brand-red-300 hover:cursor-pointer flex items-center px-2"
              aria-label={LABEL}
            >
              <FaTrash />
            </button>
          }
        >
          {LABEL}
        </Tooltip>
      )}
      title="Posten löschen?"
      description={
        <>
          Willst du den Posten{" "}
          <span className="font-bold">{position.name}</span> löschen?
        </>
      }
      confirmLabel="Löschen"
    />
  );
};
