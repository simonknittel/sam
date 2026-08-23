"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Ship, type Variant } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteShipAction } from "../actions/deleteShipAction";

interface Props {
  readonly className?: string;
  readonly ship: Pick<Ship, "id" | "name"> & {
    variant: Variant;
  };
}

export const DeleteShip = ({ className, ship }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteShipAction}
      hiddenFields={[{ name: "id", value: ship.id }]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="px-2 py-2 text-neutral-500 hover:text-neutral-50 hover:cursor-pointer"
          title="Löschen"
        >
          {isPending ? <AsciiSpinner /> : <FaTrash />}
        </button>
      )}
      title="Schiff löschen?"
      description={
        <>Willst du &quot;{ship.name || ship.variant.name}&quot; löschen?</>
      }
      confirmLabel="Löschen"
    />
  );
};
