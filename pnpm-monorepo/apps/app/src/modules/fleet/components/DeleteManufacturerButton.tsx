"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { type Manufacturer } from "@sam-monorepo/database/browser";
import { FaTrash } from "react-icons/fa";
import { deleteManufacturer } from "../actions/deleteManufacturer";

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const DeleteManufacturerButton = ({
  className,
  manufacturer,
}: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={deleteManufacturer}
      hiddenFields={[{ name: "id", value: manufacturer.id }]}
      trigger={(isPending) => (
        <Button variant="tertiary" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaTrash />} Löschen
        </Button>
      )}
      title="Hersteller löschen?"
      description={<>Willst du &quot;{manufacturer.name}&quot; löschen?</>}
      confirmLabel="Löschen"
    />
  );
};
